const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

function loadPaddleScript() {
  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PADDLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Paddle);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// `config` comes from GET /billing/checkout-config (the single source of truth for the
// Paddle environment + token). `theme` is the app's current UI theme ('dark' | 'light').
// `priceId` is the chosen plan's Paddle price id (annual or monthly); it defaults to
// the annual plan so any single-CTA caller keeps working (PRICE-2 dual pricing).
export async function openPremiumCheckout(config, theme, priceId = config.plans?.annual?.priceId) {
  const Paddle = await loadPaddleScript();

  if (!priceId) {
    throw new Error('openPremiumCheckout: no priceId (checkout-config returned no plan).');
  }

  // Paddle.js v2: call Environment.set only for sandbox; omitting it defaults to
  // production. Fail fast on any unexpected value so we never silently ship the wrong env.
  if (config.environment === 'sandbox') {
    Paddle.Environment.set('sandbox');
  } else if (config.environment !== 'production') {
    throw new Error(
      `Unexpected Paddle environment "${config.environment}"; expected "sandbox" or "production".`
    );
  }

  Paddle.Initialize({ token: config.clientToken });
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: config.customer,
    customData: config.customData,
    settings: {
      theme: theme === 'dark' ? 'dark' : 'light',
    },
  });
}
