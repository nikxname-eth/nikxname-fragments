export type Mode =
  | 'solitary'
  | 'triad'
  | 'cluster'
  | 'cascade'
  | 'field'
  | 'sheet'
  | 'flow'
  | 'wave'
  | 'bloom'
  | 'meadow'
  | 'close';
export type Family = 'garden' | 'nikxname' | 'water' | 'sun' | 'pool' | 'earth' | 'night';
export type Ground =
  | 'cream'
  | 'paper'
  | 'dusk'
  | 'charcoal'
  | 'mist'
  | 'harvest'
  | 'pool'
  | 'blush'
  | 'rose'
  | 'lawn';
export type CountBand = 'auto' | 'near' | 'field' | 'dense' | 'vast' | 'rare' | 'myth';
/** How the brush moves — not how many marks. */
export type Flow = 'auto' | 'still' | 'low' | 'mid' | 'high';
export const FLOWS: Flow[] = ['auto', 'still', 'low', 'mid', 'high'];
export const FLOW_LABELS: Record<Flow, string> = {
  auto: 'auto',
  still: 'still',
  low: 'low',
  mid: 'mid',
  high: 'high',
};

const LEGACY_FLOW: Record<string, Flow> = {
  near: 'low',
  field: 'mid',
  dense: 'high',
  vast: 'high',
  rare: 'high',
  myth: 'high',
};

export function coerceFlow(value: string | Flow | CountBand | undefined): Flow {
  if (value && (FLOWS as string[]).includes(value)) return value as Flow;
  if (value && LEGACY_FLOW[value]) return LEGACY_FLOW[value];
  return 'auto';
}
export type Aspect = '1:1' | '16:9' | '9:16';
export const ASPECTS: Aspect[] = ['1:1', '16:9', '9:16'];
export const ASPECT_LABELS: Record<Aspect, string> = {
  '1:1': '1×1 square',
  '16:9': '16×9 wide',
  '9:16': '9×16 tall',
};

/** Mint long edge in pixels. Live studio uses a smaller viewer. */
export const MINT_LONG = 4000;

export function frameSize(aspect: Aspect, long: number) {
  if (aspect === '16:9') return { w: long, h: Math.round((long * 9) / 16) };
  if (aspect === '9:16') return { w: Math.round((long * 9) / 16), h: long };
  return { w: long, h: long };
}
export type CountRarity = 'normal' | 'rare' | 'ultra';
export type Lattice =
  | 'rect'
  | 'brick'
  | 'hex'
  | 'diamond'
  | 'spiral'
  | 'rings'
  | 'radial'
  | 'diag'
  | 'cross'
  | 'petal'
  | 'curl'
  | 'mass'
  | 'veil'
  | 'bloom';
export type FlowKind =
  | 'phi-spiral'
  | 'thirds'
  | 'fibonacci'
  | 'line-of-beauty'
  | 'baroque-diag'
  | 'triangle'
  | 'vesica'
  | 'whirl'
  | 'constellation'
  | 'meander'
  | 'braid'
  | 'front'
  | 'slant'
  | 'fan'
  | 'arc'
  | 'blooms';

/** How the brush walks the canvas while the study grows. */
export type PaintPath =
  | 'ltr'
  | 'rtl'
  | 'ttb'
  | 'btt'
  | 'diag'
  | 'diag-back'
  | 'phi-spiral'
  | 'fibonacci'
  | 'whirl'
  | 'speckle';

export const PAINT_PATHS: PaintPath[] = [
  'ltr',
  'rtl',
  'ttb',
  'btt',
  'diag',
  'diag-back',
  'phi-spiral',
  'fibonacci',
  'whirl',
  'speckle',
];

export type Harmony = 'full' | 'pair' | 'mono' | 'flare';

/** How the base colour field is laid — before any marks. */
export type GradeKind = 'fall' | 'dome' | 'well' | 'sweep' | 'bloom' | 'twin' | 'corner';
export const GRADE_KINDS: GradeKind[] = ['fall', 'dome', 'well', 'sweep', 'bloom', 'twin', 'corner'];
export const GRADE_LABELS: Record<GradeKind, string> = {
  fall: 'fall',
  dome: 'dome',
  well: 'well',
  sweep: 'sweep',
  bloom: 'bloom',
  twin: 'twin',
  corner: 'corner',
};
export function coerceGrade(value: string | GradeKind | undefined): GradeKind | undefined {
  if (value && (GRADE_KINDS as string[]).includes(value)) return value as GradeKind;
  return undefined;
}

export type Plate = {
  id: string;
  src: string;
  kind?: 'figure' | 'thicket' | 'bloom';
};

export type BranchKind = 'fork' | 'rise' | 'hang' | 'sweep' | 'thicket';

export type BranchPlate = {
  id: string;
  src: string;
  kind: BranchKind;
  /** Growth direction in the plate (canvas radians, +y down). */
  axis: number;
  /** Trunk location in the plate, 0–1. */
  trunk: [number, number];
};

export type Catalog = {
  heroes: Plate[];
  marks: Plate[];
  branches?: BranchPlate[];
};

export type Rgb = { r: number; g: number; b: number };

/** One stamped plate from the painted-branch library. */
export type BranchStamp = {
  src: string;
  rot: number;
  scale: number;
  cx: number;
  cy: number;
  flipX: boolean;
  flipY: boolean;
  alpha: number;
  trunk: [number, number];
};

export type Placement = {
  plate: Plate;
  cx: number;
  cy: number;
  scale: number;
  rot: number;
  alpha: number;
  ghost: boolean;
  travel: number;
  /** Far 0 → near 1. Used for atmospheric colour. */
  layer?: 'sky' | 'horizon' | 'mid' | 'fore';
  /** Accent blossom — hero plate, pop colour, slightly reduced. */
  pop?: boolean;
  /** Continuous colour drift 0–1. Never a checker. */
  lean?: number;
  /** Painter pass. 1–8, rolled with the study. */
  pass?: number;
  /** Ground-wash stroke — colorized from the ground stack, not the family pop. */
  wash?: boolean;
  /** Contrasting blossom heart. */
  heart?: boolean;
  /** Stem stroke — inked with the stem ramp, sits under the bloom. */
  stem?: boolean;
  /** Which pop pigment. 0 rose, 1 gold, 2 cream, 3 coral, 4 lemon, 5 lilac, 6 teal, 7 peach. */
  accent?: number;
};

export type WeightKind = 'glow' | 'mass' | 'edge' | 'heart';

export type EyeWeight = {
  x: number;
  y: number;
  kind: WeightKind;
  /** How far the light reaches, 0–1. */
  r?: number;
};

/** How the work names itself. Modes stay internal. */
export type WorkKind = 'field' | 'wave' | 'bloom' | 'blossom';

/** Camera lean — foreshortens the field. */
export type ViewLean = 'flat' | 'rise' | 'side' | 'corner';

/** Leading / vanishing point. Wander — not always φ. */
export type Vanish = { x: number; y: number };

export type Painting = {
  seed: number;
  mode: Mode;
  family: Family;
  ground: Ground;
  count: number;
  countRarity: CountRarity;
  lattice?: Lattice;
  flow?: FlowKind;
  kind: WorkKind;
  view: ViewLean;
  vanish: Vanish;
  /** Land starts here. Sky wash must meet y = 0. */
  horizon?: number;
  /** 1–99, higher = rarer. Pressure to Hold. */
  rarity: number;
  /** Rolled painter passes, 3–8. Eight is mythic. */
  passes: number;
  aspect: Aspect;
  /** Seed-picked brush travel. Hidden — watching it grow is the tell. */
  path: PaintPath;
  /** Rare ink-only colour. */
  harmony: Harmony;
  /** Base gradient geometry. Hidden — the sit starts here. */
  grade?: GradeKind;
  placements: Placement[];
  branches: BranchStamp[];
  shift?: boolean;
  weight?: EyeWeight;
  note: string;
};

export const MODES: Mode[] = ['meadow', 'wave', 'bloom', 'close'];
export const MODE_LABELS: Record<'meadow' | 'wave' | 'bloom' | 'close', string> = {
  meadow: 'field',
  wave: 'wave',
  bloom: 'bloom',
  close: 'blossom',
};

const LEGACY_MODE: Record<string, Mode> = {
  flow: 'bloom',
  sheet: 'wave',
  field: 'meadow',
  solitary: 'close',
  triad: 'close',
  cluster: 'close',
  cascade: 'wave',
};

export function coerceMode(value: string | Mode | undefined): Mode {
  if (value && (MODES as string[]).includes(value)) return value as Mode;
  if (value && LEGACY_MODE[value]) return LEGACY_MODE[value];
  return 'meadow';
}
/** Internal still-life variants behind `close`. */
export const CLOSE_KINDS = ['one', 'pair', 'triad', 'still'] as const;
export const FAMILIES: Family[] = ['garden', 'nikxname', 'water', 'sun', 'pool', 'earth', 'night'];
/** Color tab — pool is rolled inside tide. */
export const COLOR_FAMILIES: Family[] = ['garden', 'nikxname', 'water', 'sun', 'earth', 'night'];

export const FAMILY_LABELS: Record<Family, string> = {
  garden: 'sap',
  nikxname: 'wine',
  water: 'tide',
  sun: 'gold',
  pool: 'tide',
  earth: 'clay',
  night: 'dusk',
};

const LEGACY_FAMILY: Record<string, Family> = {
  monet: 'water',
  gogh: 'sun',
  hockney: 'pool',
  life: 'earth',
  pastel: 'garden',
  cinematic: 'earth',
  drift: 'sun',
  warhol: 'night',
};

export function coerceFamily(value: string | Family | undefined): Family {
  if (value && (FAMILIES as string[]).includes(value)) return value as Family;
  if (value && LEGACY_FAMILY[value]) return LEGACY_FAMILY[value];
  return 'garden';
}
export const GROUNDS: Ground[] = [
  'cream',
  'paper',
  'mist',
  'harvest',
  'pool',
  'blush',
  'rose',
  'lawn',
  'dusk',
  'charcoal',
];

export const GROUND_LABELS: Record<Ground, string> = {
  cream: 'cream wash',
  paper: 'paper gold',
  mist: 'mist · lilac–gold',
  harvest: 'harvest · blue–gold',
  pool: 'pool · aqua–lime',
  blush: 'blush · pink–lemon',
  rose: 'rose gold',
  lawn: 'lawn · sage–cream',
  dusk: 'dusk',
  charcoal: 'charcoal',
};
export const COUNT_BANDS: CountBand[] = ['auto', 'near', 'field', 'dense', 'myth'];
