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

export async function openPremiumCheckout(config) {
  const Paddle = await loadPaddleScript();
  Paddle.Environment.set('sandbox');
  Paddle.Initialize({ token: config.clientToken });
  Paddle.Checkout.open({
    items: config.items,
    customer: config.customer,
    customData: config.customData,
    settings: {
      theme: 'light',
    },
  });
}
