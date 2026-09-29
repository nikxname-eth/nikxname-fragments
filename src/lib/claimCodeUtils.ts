/**
 * Manifold checkout helpers: fill Redemption Code field after Claim now opens.
 * Site form is never auto-filled — user types their code first.
 */

function setNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(input) as HTMLInputElement;
  const desc = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(proto) ?? HTMLInputElement.prototype,
    'value',
  );
  if (desc?.set) desc.set.call(input, value);
  else input.value = value;

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && el.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Fill Manifold checkout "Redemption Code" / claim code input.
 */
export function fillManifoldRedemptionCode(code: string, root: ParentNode = document): boolean {
  if (!code?.trim()) return false;
  const value = code.trim();

  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea',
    ),
  );

  const scored: { el: HTMLInputElement | HTMLTextAreaElement; score: number }[] = [];

  for (const el of inputs) {
    if (el.disabled || (el as HTMLInputElement).readOnly) continue;
    if (!isVisible(el)) continue;

    const ph = (el.placeholder || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const nearby =
      (
        el.closest('div, section, form, label')?.textContent || ''
      )
        .slice(0, 400)
        .toLowerCase() || '';

    let score = 0;
    if (ph.includes('redemption')) score += 50;
    if (ph.includes('enter redemption')) score += 60;
    if (ph.includes('claim code') || ph.includes('enter claim')) score += 40;
    if (ph.includes('code') && !ph.includes('postal') && !ph.includes('zip')) score += 25;
    if (name.includes('redemption') || id.includes('redemption')) score += 45;
    if (name.includes('code') || id.includes('code')) score += 20;
    if (aria.includes('redemption') || aria.includes('code')) score += 30;
    if (nearby.includes('redemption code')) score += 55;
    if (nearby.includes('required') && nearby.includes('code')) score += 20;
    // Prefer fields inside checkout modals
    if (el.closest('.checkout-modal, [class*="checkout"], [class*="Checkout"]')) score += 15;
    // Never fill our own site claim input
    if (el.classList.contains('finale-code-entry-input') || el.name === 'claim-code') score = -100;

    if (score > 0) scored.push({ el, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const target = scored[0]?.el;
  if (!target) return false;

  setNativeInputValue(target, value);
  target.focus();
  return true;
}

/** Click Manifold checkout CONTINUE after redemption code is set. */
export function clickManifoldCheckoutContinue(root: ParentNode = document): boolean {
  const buttons = Array.from(root.querySelectorAll<HTMLElement>('button, a[role="button"]'));
  for (const btn of buttons) {
    if (!isVisible(btn)) continue;
    const t = (btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (t === 'continue' || t === 'continue →' || t.startsWith('continue')) {
      // Prefer checkout context
      if (
        btn.closest('.checkout-modal, [class*="checkout"], [class*="Checkout"]') ||
        t === 'continue'
      ) {
        btn.click();
        return true;
      }
    }
  }
  return false;
}

/**
 * After Claim now: watch DOM for Manifold checkout, fill redemption code, optionally continue.
 */
export function runManifoldRedemptionAssist(
  code: string,
  options: { autoContinue?: boolean; durationMs?: number } = {},
): () => void {
  const { autoContinue = true, durationMs = 45_000 } = options;
  if (!code.trim()) return () => {};

  let filled = false;
  let continued = false;
  const started = Date.now();

  const tick = () => {
    if (Date.now() - started > durationMs) {
      cleanup();
      return;
    }
    if (!filled) {
      filled = fillManifoldRedemptionCode(code);
    }
    if (filled && autoContinue && !continued) {
      // Brief delay so Manifold validates the field
      continued = clickManifoldCheckoutContinue();
    }
    if (filled && (!autoContinue || continued)) {
      // Keep refilling briefly in case Manifold remounts the input
      if (continued || Date.now() - started > 8_000) cleanup();
    }
  };

  const obs = new MutationObserver(() => tick());
  obs.observe(document.body, { childList: true, subtree: true, attributes: true });

  const interval = window.setInterval(tick, 350);
  // Immediate + staggered attempts
  tick();
  const t1 = window.setTimeout(tick, 200);
  const t2 = window.setTimeout(tick, 600);
  const t3 = window.setTimeout(tick, 1_200);
  const t4 = window.setTimeout(tick, 2_500);

  function cleanup() {
    obs.disconnect();
    window.clearInterval(interval);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearTimeout(t3);
    window.clearTimeout(t4);
  }

  return cleanup;
}
