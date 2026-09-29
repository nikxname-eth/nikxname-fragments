/**
 * Manifold checkout quantity: always start at 1, never above wallet allotment.
 */

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && el.getClientRects().length === 0) return false;
  const s = window.getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden';
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const proto = Object.getPrototypeOf(input);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clampMax(maxQty: number): number {
  const n = Math.floor(Number(maxQty));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 99);
}

/** Inputs we've already defaulted to 1 this page session (allow user to raise within max). */
const qtyStarted = new WeakSet<HTMLInputElement>();

function looksLikeQtyInput(input: HTMLInputElement): boolean {
  const nearby = (input.closest('div, section, form')?.textContent || '')
    .slice(0, 200)
    .toLowerCase();
  const aria = (input.getAttribute('aria-label') || '').toLowerCase();
  return (
    aria.includes('quantity') ||
    aria.includes('qty') ||
    nearby.includes('quantity') ||
    nearby.includes('qty') ||
    nearby.includes('per mint') ||
    Number(input.max) > 1 ||
    Number(input.value) > 1 ||
    input.type === 'number'
  );
}

/**
 * Clamp Manifold checkout quantity to [1, maxQty], defaulting each control to 1 once.
 * Most wallets: maxQty = 1. Multi-set / multi-code wallets: max = remaining allotment.
 */
export function forceManifoldCheckoutQuantity(
  root: ParentNode = document,
  maxQty = 1,
): boolean {
  const max = clampMax(maxQty);
  let changed = false;

  const numberInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="number"]'),
  );
  for (const input of numberInputs) {
    if (!isVisible(input)) continue;
    if (!looksLikeQtyInput(input)) continue;

    input.min = '1';
    input.max = String(max);
    input.setAttribute('min', '1');
    input.setAttribute('max', String(max));

    const raw = Number(input.value);
    const invalid = !Number.isFinite(raw) || input.value === '';

    if (!qtyStarted.has(input)) {
      qtyStarted.add(input);
      if (invalid || raw !== 1) {
        setNativeValue(input, '1');
        changed = true;
      }
      continue;
    }

    if (invalid || raw < 1) {
      setNativeValue(input, '1');
      changed = true;
    } else if (raw > max) {
      setNativeValue(input, String(max));
      changed = true;
    }
  }

  const textInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])'),
  );
  for (const input of textInputs) {
    if (!isVisible(input)) continue;
    if (input.classList.contains('finale-code-entry-input')) continue;
    const aria = (input.getAttribute('aria-label') || '').toLowerCase();
    const nearby = (input.closest('div, section')?.textContent || '').slice(0, 120).toLowerCase();
    if (!aria.includes('quantity') && !nearby.includes('quantity')) continue;
    if (!/^\d*$/.test(input.value)) continue;

    const raw = Number(input.value || '0');
    if (!qtyStarted.has(input)) {
      qtyStarted.add(input);
      if (input.value !== '1') {
        setNativeValue(input, '1');
        changed = true;
      }
      continue;
    }
    if (!input.value || raw < 1) {
      setNativeValue(input, '1');
      changed = true;
    } else if (raw > max) {
      setNativeValue(input, String(max));
      changed = true;
    }
  }

  // Qty steppers: disable + at max, enable below max
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
  for (const btn of buttons) {
    if (!isVisible(btn)) continue;
    const t = (btn.textContent || '').trim();
    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const isInc =
      t === '+' ||
      t === '＋' ||
      aria.includes('increase') ||
      aria.includes('increment') ||
      aria.includes('add quantity');
    const isDec =
      t === '−' ||
      t === '–' ||
      t === '-' ||
      aria.includes('decrease') ||
      aria.includes('decrement') ||
      aria.includes('reduce quantity');
    if (!isInc && !isDec) continue;

    const inCheckout =
      btn.closest('.checkout-modal, [class*="checkout"], [class*="Checkout"], [class*="quantity"]') !=
      null;
    if (!inCheckout && !aria.includes('quantity')) continue;

    // Read nearby qty if possible
    const scope = btn.closest('div, section, form') || btn.parentElement;
    const qtyInput = scope?.querySelector<HTMLInputElement>(
      'input[type="number"], input[aria-label*="quantity" i]',
    );
    const current = qtyInput ? Number(qtyInput.value) || 1 : 1;

    if (isInc) {
      const atMax = max <= 1 || current >= max;
      if (atMax) {
        if (!btn.disabled) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.35';
          changed = true;
        }
      } else if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        changed = true;
      }
    }

    if (isDec) {
      const atMin = current <= 1;
      if (atMin) {
        if (!btn.disabled) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.35';
          changed = true;
        }
      } else if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        changed = true;
      }
    }
  }

  return changed;
}

/** @deprecated use forceManifoldCheckoutQuantity(root, 1) */
export function forceManifoldCheckoutQuantityOne(root: ParentNode = document): boolean {
  return forceManifoldCheckoutQuantity(root, 1);
}

/**
 * Watch Manifold checkout and keep quantity in [1, maxQty], starting at 1.
 */
export function watchManifoldCheckoutQuantity(
  maxQty = 1,
  durationMs = 90_000,
): () => void {
  const max = clampMax(maxQty);
  const started = Date.now();
  const tick = () => {
    if (Date.now() - started > durationMs) {
      cleanup();
      return;
    }
    forceManifoldCheckoutQuantity(document, max);
  };

  const obs = new MutationObserver(() => tick());
  obs.observe(document.body, { childList: true, subtree: true, attributes: true });
  const interval = window.setInterval(tick, 400);
  tick();
  const times = [100, 300, 700, 1_500, 3_000].map((ms) => window.setTimeout(tick, ms));

  function cleanup() {
    obs.disconnect();
    window.clearInterval(interval);
    times.forEach((t) => window.clearTimeout(t));
  }

  return cleanup;
}

/** @deprecated use watchManifoldCheckoutQuantity(1, durationMs) */
export function watchManifoldCheckoutQtyOne(durationMs = 90_000): () => void {
  return watchManifoldCheckoutQuantity(1, durationMs);
}

/**
 * While finale claim modal is open, only the active instance widget should be live.
 * Deactivate other m-claim-buy-only hosts so they cannot stack cart items.
 */
export function isolateManifoldClaimWidget(activeInstanceId: string): () => void {
  const hosts = Array.from(
    document.querySelectorAll<HTMLElement>('[data-widget="m-claim-buy-only"]'),
  );

  const previous: { el: HTMLElement; display: string; pointer: string }[] = [];

  for (const el of hosts) {
    const id = el.getAttribute('data-id') || '';
    const wrap = el.closest('.mint-btn-wrap') as HTMLElement | null;
    const target = wrap || el;
    if (id === activeInstanceId && el.closest('.finale-claim-panel')) {
      // keep active finale widget
      continue;
    }
    // Hide/disable every other claim widget on the page
    previous.push({
      el: target,
      display: target.style.display,
      pointer: target.style.pointerEvents,
    });
    target.style.pointerEvents = 'none';
    if (!el.closest('.finale-claim-panel')) {
      target.setAttribute('data-finale-isolated', '1');
    }
  }

  // Also hide non-active finale widgets if any leftover
  for (const el of hosts) {
    const id = el.getAttribute('data-id') || '';
    if (id !== activeInstanceId && el.closest('.finale-claim-panel')) {
      const wrap = (el.closest('.mint-btn-wrap') as HTMLElement) || el;
      previous.push({
        el: wrap,
        display: wrap.style.display,
        pointer: wrap.style.pointerEvents,
      });
      wrap.style.display = 'none';
      wrap.style.pointerEvents = 'none';
    }
  }

  return () => {
    for (const { el, display, pointer } of previous) {
      el.style.display = display;
      el.style.pointerEvents = pointer;
      el.removeAttribute('data-finale-isolated');
    }
  };
}
