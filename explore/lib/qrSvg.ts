/**
 * On-origin QR (byte mode, auto version, ECC M, auto mask).
 *
 * Based on Project Nayuki’s QR Code generator library (MIT).
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * No npm QR package. TV and phone never call a third-party QR CDN.
 */

const MIN_VERSION = 1;
const MAX_VERSION = 10;
const ECC_M: readonly [number, number] = [1, 0];

const ECC_CODEWORDS_PER_BLOCK = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5,
];

function getBit(x: number, i: number) {
  return ((x >>> i) & 1) !== 0;
}

function appendBits(val: number, len: number, bb: number[]) {
  for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
}

function getNumRawDataModules(ver: number) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
  }
  return result;
}

function getNumDataCodewords(ver: number) {
  return Math.floor(getNumRawDataModules(ver) / 8) - ECC_CODEWORDS_PER_BLOCK[ver] * NUM_ERROR_CORRECTION_BLOCKS[ver];
}

function reedSolomonMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonComputeDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= reedSolomonMultiply(coef, factor);
    });
  }
  return result;
}

function alignmentPositions(version: number, size: number) {
  if (version === 1) return [] as number[];
  const numAlign = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function addEccAndInterleave(version: number, data: number[]) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function maskFn(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return (x * y) % 2 + (x * y) % 3 === 0;
    case 6:
      return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
    default:
      return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
  }
}

function finderPenaltyAddHistory(size: number, currentRunLength: number, runHistory: number[]) {
  if (runHistory[0] === 0) currentRunLength += size;
  runHistory.pop();
  runHistory.unshift(currentRunLength);
}

function finderPenaltyCountPatterns(runHistory: number[]) {
  const n = runHistory[1];
  const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
  return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
}

function penaltyScore(modules: boolean[][], size: number) {
  let result = 0;
  const scan = (majorIsRow: boolean) => {
    for (let a = 0; a < size; a++) {
      let runColor = false;
      let run = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let b = 0; b < size; b++) {
        const color = majorIsRow ? modules[a][b] : modules[b][a];
        if (color === runColor) {
          run++;
          if (run === 5) result += 3;
          else if (run > 5) result += 1;
        } else {
          finderPenaltyAddHistory(size, run, runHistory);
          if (!runColor) result += finderPenaltyCountPatterns(runHistory) * 40;
          runColor = color;
          run = 1;
        }
      }
      if (runColor) {
        finderPenaltyAddHistory(size, run, runHistory);
        run = 0;
      }
      run += size;
      finderPenaltyAddHistory(size, run, runHistory);
      result += finderPenaltyCountPatterns(runHistory) * 40;
    }
  };
  scan(true);
  scan(false);
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
        result += 3;
      }
    }
  }
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * 10;
  return result;
}

function encodeMatrix(text: string): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (!bytes.length || bytes.length > 200) return null;

  let version = MIN_VERSION;
  const usedBitsFor = (ver: number) => 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8;
  for (; version <= MAX_VERSION; version++) {
    if (usedBitsFor(version) + 4 <= getNumDataCodewords(version) * 8) break;
  }
  if (version > MAX_VERSION) return null;

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };

  const drawAlignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  const drawFormatBits = (mask: number) => {
    const data = (ECC_M[1] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFunction(8, i, getBit(bits, i));
    setFunction(8, 7, getBit(bits, 6));
    setFunction(8, 8, getBit(bits, 7));
    setFunction(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, getBit(bits, i));
    setFunction(8, size - 8, true);
  };

  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);
  const alignPos = alignmentPositions(version, size);
  for (let i = 0; i < alignPos.length; i++) {
    for (let j = 0; j < alignPos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === alignPos.length - 1) || (i === alignPos.length - 1 && j === 0)) {
        continue;
      }
      drawAlignment(alignPos[i], alignPos[j]);
    }
  }
  drawFormatBits(0);

  const bb: number[] = [];
  appendBits(0x4, 4, bb);
  appendBits(bytes.length, version <= 9 ? 8 : 16, bb);
  for (const b of bytes) appendBits(b, 8, bb);
  const dataCapacityBits = getNumDataCodewords(version) * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
  appendBits(0, (8 - (bb.length % 8)) % 8, bb);
  for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) appendBits(padByte, 8, bb);
  const dataCodewords = new Array(Math.ceil(bb.length / 8)).fill(0);
  bb.forEach((bit, i) => {
    dataCodewords[i >>> 3] |= bit << (7 - (i & 7));
  });

  const allCodewords = addEccAndInterleave(version, dataCodewords);
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < allCodewords.length * 8) {
          modules[y][x] = getBit(allCodewords[bitIndex >>> 3], 7 - (bitIndex & 7));
          bitIndex += 1;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunction[y][x] && maskFn(mask, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  let chosen = 0;
  let minPenalty = 1e9;
  for (let i = 0; i < 8; i++) {
    applyMask(i);
    drawFormatBits(i);
    const penalty = penaltyScore(modules, size);
    if (penalty < minPenalty) {
      chosen = i;
      minPenalty = penalty;
    }
    applyMask(i);
  }
  applyMask(chosen);
  drawFormatBits(chosen);
  return modules;
}

export function qrMatrix(text: string): number[][] | null {
  const modules = encodeMatrix(text);
  if (!modules) return null;
  return modules.map((row) => row.map((cell) => (cell ? 1 : 0)));
}

export function qrSvg(text: string, size = 168): string {
  const m = qrMatrix(text);
  if (!m) return '';
  const n = m.length;
  const quiet = 4;
  const dim = n + quiet * 2;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!m[r][c]) continue;
      parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${dim}" height="${dim}" fill="#f6f0e8"/><path fill="#120e0b" d="${parts.join('')}"/></svg>`;
}
