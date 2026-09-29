import { getPieceNumberForInstanceId, PIECE_NAMES } from '../config/artist';

/** Explicit Manifold error UI — never treat as success. */
export function checkoutHasError(): boolean {
  if (
    document.querySelector(
      [
        '.checkout-modal.error',
        '.checkout-error',
        '.checkout-modal .error',
        '[class*="checkout"][class*="error"]',
        '[class*="Checkout"][class*="error"]',
        '.m-error',
      ].join(','),
    )
  ) {
    return true;
  }

  const text = (
    document.querySelector('.checkout-modal, [class*="checkout-modal"], [class*="Checkout"]')
      ?.textContent || ''
  ).toLowerCase();

  if (!text) return false;

  const errorPhrases = [
    'transaction failed',
    'mint failed',
    'user rejected',
    'user denied',
    'rejected the request',
    'insufficient funds',
    'something went wrong',
    'error occurred',
    'failed to mint',
    'claim failed',
    'unable to complete',
  ];
  return errorPhrases.some((p) => text.includes(p));
}

/**
 * Strict success only — no body-wide text heuristics (those false-positive after a prior mint).
 * Prefer success class / post-mint action containers.
 */
export function checkoutSucceeded(): boolean {
  if (checkoutHasError()) return false;

  return Boolean(
    document.querySelector('.checkout-modal.success') ||
      document.querySelector('.checkout-success-actions') ||
      document.querySelector('.checkout-post-mint-message') ||
      // Title alone is weak; require it inside a success-styled modal if possible
      document.querySelector('.checkout-modal.success .checkout-post-mint-title') ||
      document.querySelector('[class*="checkout"][class*="success"]'),
  );
}

/**
 * Watch only for *newly added* success nodes after `sinceMs`.
 * Ignores leftover success UI from a previous mint.
 */
export function watchCheckoutSuccess(options: {
  sinceMs: number;
  onSuccess: (source: string) => void;
  onError?: (source: string) => void;
}): () => void {
  const { sinceMs, onSuccess, onError } = options;
  let done = false;

  const finishOk = (source: string) => {
    if (done) return;
    if (Date.now() < sinceMs) return;
    if (checkoutHasError()) {
      onError?.('error-ui');
      return;
    }
    if (!checkoutSucceeded()) return;
    done = true;
    onSuccess(source);
  };

  const finishErr = (source: string) => {
    if (done) return;
    if (!checkoutHasError()) return;
    // Don't mark done forever on transient error — allow retry with same code
    onError?.(source);
  };

  const onMutations: MutationCallback = (mutations) => {
    if (done) return;
    if (Date.now() < sinceMs) return;

    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        const el = node;
        const cls = el.className?.toString?.() || '';
        const text = (el.textContent || '').toLowerCase();

        if (
          el.matches?.(
            '.checkout-modal.success, .checkout-success-actions, .checkout-post-mint-message, [class*="checkout"][class*="success"]',
          ) ||
          el.querySelector?.(
            '.checkout-modal.success, .checkout-success-actions, .checkout-post-mint-message',
          )
        ) {
          finishOk('dom-added-success');
          return;
        }

        if (
          cls.includes('error') ||
          text.includes('transaction failed') ||
          text.includes('user rejected') ||
          text.includes('user denied')
        ) {
          finishErr('dom-added-error');
        }
      }

      if (m.type === 'attributes' && m.target instanceof HTMLElement) {
        const t = m.target;
        if (
          t.classList?.contains('success') &&
          (t.className.includes('checkout') || t.closest('[class*="checkout"]'))
        ) {
          finishOk('dom-attr-success');
          return;
        }
      }
    }

    // Periodic re-check for success class flips without node add
    if (checkoutSucceeded()) finishOk('dom-poll-success');
    else if (checkoutHasError()) finishErr('dom-poll-error');
  };

  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  const poll = window.setInterval(() => {
    if (done) return;
    if (Date.now() < sinceMs) return;
    if (checkoutSucceeded()) finishOk('interval-success');
    else if (checkoutHasError()) finishErr('interval-error');
  }, 1_000);

  return () => {
    done = true;
    observer.disconnect();
    window.clearInterval(poll);
  };
}

function isVisibleCheckoutEl(el: HTMLElement): boolean {
  if (el.offsetParent === null && el.getClientRects().length === 0) return false;
  const s = window.getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
}

/** True when Manifold's claim/checkout overlay is on screen. */
export function isManifoldCheckoutOpen(): boolean {
  if (typeof document === 'undefined') return false;
  if (checkoutSucceeded() || checkoutHasError()) return true;

  const roots = document.querySelectorAll<HTMLElement>(
    [
      '.checkout-modal',
      '[class*="checkout-modal"]',
      '#m-claim-complete-dialog',
      '#m-identity-verification-dialog',
      '[class*="Checkout"]',
    ].join(','),
  );
  for (const el of Array.from(roots)) {
    if (isVisibleCheckoutEl(el)) return true;
  }

  // Fee + order summary copy is a reliable open signal for claim checkouts
  const body = (document.body?.innerText || '').toLowerCase();
  if (
    body.includes('transaction fee') &&
    (body.includes('order') || body.includes('claim') || body.includes('mint'))
  ) {
    // Require a modal-ish container so we don't match page chrome
    return Boolean(
      document.querySelector(
        '.checkout-modal, [class*="checkout-modal"], [role="dialog"], [class*="modal"]',
      ),
    );
  }
  return false;
}

/**
 * Primary mint/purchase CTA inside checkout (not cancel/close/qty steppers).
 * Claim flow often opens an order summary that still needs one more click
 * before the wallet extension prompts — we auto-advance that step.
 */
export function findCheckoutPrimaryAction(root: ParentNode = document): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const scopes: ParentNode[] = [
    document.querySelector('.checkout-modal') as ParentNode,
    document.querySelector('[class*="checkout-modal"]') as ParentNode,
    document.querySelector('#m-claim-complete-dialog') as ParentNode,
    document.querySelector('#m-identity-verification-dialog') as ParentNode,
    document.querySelector('[role="dialog"]') as ParentNode,
    root,
  ].filter(Boolean) as ParentNode[];

  type Scored = { el: HTMLElement; score: number };
  const scored: Scored[] = [];
  const seen = new Set<HTMLElement>();

  for (const scope of scopes) {
    const buttons = Array.from(
      scope.querySelectorAll<HTMLElement>(
        'button, a[role="button"], [role="button"], input[type="submit"]',
      ),
    );
    for (const el of buttons) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (!isVisibleCheckoutEl(el)) continue;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') continue;
      // Never re-click site claim widgets
      if (el.closest('[data-widget="m-claim-buy-only"], .finale-mint-wrap, .mint-btn-wrap')) {
        continue;
      }

      const t = [
        el.getAttribute('aria-label') || '',
        (el as HTMLInputElement).value || '',
        el.textContent || '',
      ]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (!t || t.length > 56) continue;
      if (
        /\b(cancel|close|back|disconnect|reject|deny|edit|remove|continue shopping)\b/.test(t)
      ) {
        continue;
      }
      if (/^(×|✕|x|\+|＋|−|–|-)$/i.test(t.trim())) continue;

      let score = 0;
      if (
        /\b(complete purchase|confirm purchase|place order|buy now|mint now|claim now|confirm & mint|confirm mint|complete claim|claim free|complete free|pay now)\b/.test(
          t,
        )
      ) {
        score = 100;
      } else if (/\b(complete|confirm|purchase|checkout|mint|claim|buy|pay|submit)\b/.test(t)) {
        score = 55;
      } else if (t === 'continue' || t.startsWith('continue')) {
        score = 40;
      } else {
        continue;
      }

      // Prefer controls inside explicit checkout containers
      if (el.closest('.checkout-modal, [class*="checkout"], [role="dialog"]')) score += 15;
      try {
        const r = el.getBoundingClientRect();
        if (r.width * r.height > 8_000) score += 8;
      } catch {
        /* ignore */
      }

      scored.push({ el, score });
    }
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].el;
}

/**
 * After the claim widget opens Manifold checkout: clamp qty to [1, maxQty]
 * (default start 1) and click the primary purchase CTA so the wallet opens.
 */
export async function advanceCheckoutToWallet(
  timeoutMs = 14_000,
  options: { maxQty?: number } = {},
): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const maxQty = Math.max(1, Math.floor(options.maxQty ?? 1));
  const { forceManifoldCheckoutQuantity } = await import('./manifoldCheckoutQty');
  const start = Date.now();
  let advanced = false;
  let sawCheckout = false;

  while (Date.now() - start < timeoutMs) {
    if (checkoutSucceeded() || checkoutHasError()) return advanced;

    const open = isManifoldCheckoutOpen();
    if (open) sawCheckout = true;

    if (!open) {
      // Wait for modal to appear after widget click
      await new Promise((r) => setTimeout(r, 180));
      continue;
    }

    try {
      forceManifoldCheckoutQuantity(document, maxQty);
    } catch {
      /* ignore */
    }

    const btn = findCheckoutPrimaryAction();
    if (btn) {
      try {
        btn.click();
        advanced = true;
      } catch {
        /* ignore */
      }
      // Nudge once more if still idle (disabled→enabled race)
      await new Promise((r) => setTimeout(r, 1_600));
      if (
        isManifoldCheckoutOpen() &&
        !checkoutSucceeded() &&
        !checkoutHasError()
      ) {
        const again = findCheckoutPrimaryAction();
        if (again) {
          try {
            again.click();
            advanced = true;
          } catch {
            /* ignore */
          }
        }
      }
      return advanced;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  return advanced || sawCheckout;
}

/** Best-effort close of Manifold checkout overlay after success. */
export function closeManifoldCheckout(): void {
  const selectors = [
    '.checkout-modal button[aria-label*="close" i]',
    '.checkout-modal .close',
    '.checkout-modal [class*="close"]',
    'button[aria-label="Close"]',
    'button[aria-label="close"]',
  ];
  for (const sel of selectors) {
    const btn = document.querySelector<HTMLElement>(sel);
    if (btn && btn.offsetParent !== null) {
      btn.click();
      return;
    }
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

export function resolveMintedPiece(): number {
  const widgets = document.querySelectorAll('[data-widget="m-claim-buy-only"][data-id]');
  for (const widget of widgets) {
    const piece = getPieceNumberForInstanceId(widget.getAttribute('data-id'));
    if (piece > 0) return piece;
  }
  return 0;
}

/** Prefer Manifold checkout title; fall back to site piece naming. */
export function resolveCheckoutPieceName(pieceNumber: number): string {
  const titleEl = document.querySelector('.checkout-post-mint-title');
  const fromCheckout = titleEl?.textContent?.replace(/\s+/g, ' ').trim();
  if (fromCheckout) return fromCheckout;

  if (pieceNumber > 0) {
    return (
      PIECE_NAMES[pieceNumber] ?? `Fragment ${String(pieceNumber).padStart(2, '0')}`
    );
  }

  return 'a fragment';
}
