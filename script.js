console.log('[PL] script.js loaded successfully');

// ── Mobile menu ──────────────────────────────────────────────────────────────
const menu = document.querySelector('.menu-toggle');
const nav  = document.querySelector('.primary-nav');
menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
}));

// ── Chapter rail ──────────────────────────────────────────────────────────────
const rail = document.getElementById('chapter-rail');
document.querySelector('[data-rail-prev]')?.addEventListener('click', () =>
  rail.scrollBy({ left: -rail.clientWidth * 0.82, behavior: 'smooth' }));
document.querySelector('[data-rail-next]')?.addEventListener('click', () =>
  rail.scrollBy({ left: rail.clientWidth * 0.82, behavior: 'smooth' }));

// ── Preview modal ─────────────────────────────────────────────────────────────
const previewModal = document.getElementById('preview-modal');
const orderModal   = document.getElementById('order-modal');

document.querySelector('.preview-open')?.addEventListener('click', () => {
  previewModal.classList.add('open');
  previewModal.setAttribute('aria-hidden', 'false');
});

document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => {
  const m = b.closest('.modal');
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
}));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
  }
});

// ── Newsletter (footer) ───────────────────────────────────────────────────────
document.querySelector('.newsletter')?.addEventListener('submit', e => {
  e.preventDefault();
  e.currentTarget.innerHTML = '<span style="padding:11px;color:#fff;font-size:11px">Thank you. You are on the list.</span>';
});

// ── Look Inside carousel active card ──────────────────────────────────────────
const previewRow    = document.querySelector('.preview-row');
const previewFigures = previewRow?.querySelectorAll('figure');
if (previewRow && previewFigures.length) {
  const updateActiveCard = () => {
    if (window.innerWidth > 760) { previewFigures.forEach(f => f.classList.remove('active')); return; }
    const centre = previewRow.scrollLeft + previewRow.clientWidth / 2;
    let closest = null, minDist = Infinity;
    previewFigures.forEach(f => {
      const d = Math.abs(f.offsetLeft + f.clientWidth / 2 - centre);
      if (d < minDist) { minDist = d; closest = f; }
    });
    previewFigures.forEach(f => f.classList.toggle('active', f === closest));
  };
  previewRow.addEventListener('scroll', updateActiveCard);
  updateActiveCard();
  window.addEventListener('resize', updateActiveCard);
}

// ── Product state & API integration ──────────────────────────────────────────

const _ENABLE_HARDCOPY = window.ENABLE_HARDCOPY !== undefined ? window.ENABLE_HARDCOPY : false;

const ebookProduct = {
  id: "purposeful-living-ebook",
  name: "Purposeful Living E-book",
  price: 5000,
  currency: "NGN",
  format: "PDF",
  active: true
};

let _products = [];
let _selectedProductCode = null;

function setButtonContent(button, label) {
  if (!button) return;

  if (!button.classList.contains('hero-button')) {
    button.innerHTML = `${label} <span>→</span>`;
    return;
  }

  let content = button.querySelector('.hero-button__content');
  if (!content) {
    button.textContent = '';
    content = document.createElement('span');
    content.className = 'hero-button__content';
    button.append(content);
  }

  let labelEl = content.querySelector('.button-label');
  if (!labelEl) {
    labelEl = document.createElement('span');
    labelEl.className = 'button-label';
    content.prepend(labelEl);
  }

  let arrowEl = content.querySelector('.button-arrow');
  if (!arrowEl) {
    arrowEl = document.createElement('span');
    arrowEl.className = 'button-arrow';
    arrowEl.setAttribute('aria-hidden', 'true');
    content.append(arrowEl);
  }

  labelEl.textContent = label;
  arrowEl.textContent = '→';
}

/**
 * Initialize layout and pricing statically using default configuration.
 * Prevents layout flash / CLS before API response is loaded.
 */
function initStaticPricing() {
  const priceLabel = `₦${Number(ebookProduct.price).toLocaleString('en-NG')}`;

  // Update E-book price display in dedicated section
  const priceDisplay = document.querySelector('.ebook-price-display');
  if (priceDisplay) priceDisplay.textContent = priceLabel;

  // Update E-book buttons
  document.querySelectorAll('.order-btn[data-product="E-book"]').forEach(btn => {
    btn.dataset.productCode = 'PURPOSEFUL_LIVING_EBOOK';
    btn.dataset.mode = 'order';
    
    if (btn.closest('.ebook-price-cta')) {
      btn.innerHTML = `Buy the E-book <span>→</span>`;
    }
  });

  // Hero primary ebook-only button
  const heroPrimaryEbook = document.querySelector('.hero-actions .button.primary.ebook-only');
  if (heroPrimaryEbook) {
    heroPrimaryEbook.dataset.productCode = 'PURPOSEFUL_LIVING_EBOOK';
    heroPrimaryEbook.dataset.mode = 'order';
    setButtonContent(heroPrimaryEbook, 'Buy the E-book');
  }

  // Mobile buy e-book price
  const mobileEbookLink = document.querySelector('.mobile-buy a:last-child');
  if (mobileEbookLink) {
    const priceEl = mobileEbookLink.querySelector('.buy-price');
    if (priceEl) priceEl.textContent = priceLabel;
  }
}

/**
 * Fetch server-authoritative product data and update every relevant UI element.
 * Called once on page load.
 */
async function initProductState() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    let { products } = await res.json();

    // Enforce feature flag filtering
    if (!_ENABLE_HARDCOPY) {
      products = products.filter(p => p.format !== 'PHYSICAL');
    }

    _products = products;
    applyProductState(products);
  } catch {
    // Fail silently — buttons remain in their default HTML state
  }
}

function getProduct(code) {
  return _products.find(p => p.code === code) ?? null;
}

function applyProductState(products) {
  const signed = products.find(p => p.code === 'PURPOSEFUL_LIVING_SIGNED');
  const ebook  = products.find(p => p.code === 'PURPOSEFUL_LIVING_EBOOK');

  if (signed) updateSignedCopyControls(signed);
  if (ebook)  updateEbookControls(ebook);
}

function updateSignedCopyControls(product) {
  const mode = product.salesMode; // AVAILABLE | WAITLIST | SOLD_OUT
  const priceLabel = `₦${Number(product.priceNaira).toLocaleString('en-NG')}`;

  // Hero CTA
  const heroPrimary = document.querySelector('.hero-actions .button.primary');
  if (heroPrimary) {
    if (mode === 'AVAILABLE') {
      setButtonContent(heroPrimary, 'Order the Signed Copy');
      heroPrimary.dataset.productCode = product.code;
      heroPrimary.dataset.mode = 'order';
    } else if (mode === 'WAITLIST') {
      setButtonContent(heroPrimary, 'Join the Waitlist');
      heroPrimary.dataset.productCode = product.code;
      heroPrimary.dataset.mode = 'waitlist';
    } else {
      setButtonContent(heroPrimary, 'Sold Out');
      heroPrimary.dataset.mode = 'soldout';
    }
  }

  // Order section button
  document.querySelectorAll('.order-btn[data-product="Signed Physical Copy"]').forEach(btn => {
    const priceEl = btn.closest('.product-copy')?.querySelector('strong');
    if (priceEl) priceEl.textContent = priceLabel;

    if (mode === 'AVAILABLE') {
      btn.innerHTML = `Order Hard Copy <span>→</span>`;
      btn.dataset.productCode = product.code;
      btn.dataset.mode = 'order';
      btn.disabled = false;
    } else if (mode === 'WAITLIST') {
      btn.innerHTML = `Join the Waitlist <span>→</span>`;
      btn.dataset.productCode = product.code;
      btn.dataset.mode = 'waitlist';
      btn.disabled = false;
    } else {
      btn.innerHTML = `Sold Out <span>→</span>`;
      btn.disabled = true;
    }
  });

  // Mobile sticky bar (first link)
  const mobileCopyLink = document.querySelector('.mobile-buy a:first-child');
  if (mobileCopyLink) {
    const labelEl = mobileCopyLink.querySelector('.buy-label');
    const priceEl = mobileCopyLink.querySelector('.buy-price');
    if (mode === 'WAITLIST') {
      if (labelEl) labelEl.textContent = 'Join Waitlist';
      if (priceEl) priceEl.textContent = '';
    } else if (mode === 'AVAILABLE') {
      if (labelEl) labelEl.textContent = 'Hard Copy';
      if (priceEl) priceEl.textContent = priceLabel;
    }
  }
}

function updateEbookControls(product) {
  const priceLabel = `₦${Number(product.priceNaira).toLocaleString('en-NG')}`;

  // Update E-book price display in dedicated section
  const priceDisplay = document.querySelector('.ebook-price-display');
  if (priceDisplay) priceDisplay.textContent = priceLabel;

  document.querySelectorAll('.order-btn[data-product="E-book"]').forEach(btn => {
    const priceEl = btn.closest('.product-copy')?.querySelector('strong');
    if (priceEl) priceEl.textContent = priceLabel;

    btn.dataset.productCode = product.code;
    btn.dataset.mode = 'order';

    if (btn.closest('.ebook-price-cta')) {
      btn.innerHTML = `Buy the E-book <span>→</span>`;
    }
  });

  // Hero secondary button (when physical-only is active)
  const heroSecondary = document.querySelector('.hero-actions .button.secondary.physical-only');
  if (heroSecondary) {
    heroSecondary.dataset.productCode = product.code;
    heroSecondary.dataset.mode = 'order';
  }

  // Hero primary ebook-only button
  const heroPrimaryEbook = document.querySelector('.hero-actions .button.primary.ebook-only');
  if (heroPrimaryEbook) {
    heroPrimaryEbook.dataset.productCode = product.code;
    heroPrimaryEbook.dataset.mode = 'order';
    setButtonContent(heroPrimaryEbook, 'Buy the E-book');
  }

  // Mobile sticky bar e-book price
  const mobileEbookLink = document.querySelector('.mobile-buy a:last-child');
  if (mobileEbookLink) {
    const priceEl = mobileEbookLink.querySelector('.buy-price');
    if (priceEl) priceEl.textContent = priceLabel;
  }
}

// ── Order modal trigger ───────────────────────────────────────────────────────
function openOrderModal(productCode, mode) {
  if (!productCode) return;

  const product = getProduct(productCode);
  const isPhysical = product?.format === 'PHYSICAL';
  const isWaitlist = mode === 'waitlist';

  document.getElementById('field-product-code').value = productCode;
  document.getElementById('modal-product').textContent =
    product?.name ?? 'Purposeful Living';
  document.getElementById('modal-kicker').textContent =
    isWaitlist ? 'Join the waitlist' : 'Order request';

  // Show/hide delivery fields for physical vs ebook
  const physicalFields = document.getElementById('physical-fields');
  if (physicalFields) {
    physicalFields.style.display = isPhysical && !isWaitlist ? 'block' : 'none';
    physicalFields.querySelectorAll('input,textarea').forEach(el => {
      el.required = isPhysical && !isWaitlist && el.id === 'field-address';
    });
  }

  // Adjust submit button text
  const submitBtn = document.getElementById('order-submit-btn');
  if (submitBtn) {
    submitBtn.innerHTML = isWaitlist
      ? 'Join the Waitlist <span>→</span>'
      : 'Continue to Payment <span>→</span>';
  }

  // Store mode on form
  document.getElementById('order-form').dataset.mode = mode ?? 'order';

  clearFormError();
  orderModal.classList.add('open');
  orderModal.setAttribute('aria-hidden', 'false');
}

// Wire all CTA buttons (order section + hero) to openOrderModal
console.log('[PL] Registering click listener');
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-product-code],[data-product]');
  if (!btn) return;

  console.log('[PL] Buy button clicked:', btn.tagName, btn.className, btn.dataset);

  const mode = btn.dataset.mode ?? 'order';
  const code = btn.dataset.productCode;

  // Buttons with old data-product attribute (before API loads)
  const legacyProduct = btn.dataset.product;

  if (code) {
    e.preventDefault();
    if (mode === 'soldout') { console.log('[PL] Sold out, ignoring'); return; }
    console.log('[PL] Opening order modal for', code, mode);
    try {
      openOrderModal(code, mode);
    } catch (err) {
      console.error('[PL] openOrderModal error:', err);
      alert('Error: ' + err.message);
    }
  } else if (legacyProduct) {
    e.preventDefault();
    // Map legacy label to code
    const mapped = legacyProduct === 'Signed Physical Copy'
      ? 'PURPOSEFUL_LIVING_SIGNED'
      : 'PURPOSEFUL_LIVING_EBOOK';
    console.log('[PL] Legacy button mapped to', mapped);
    try {
      openOrderModal(mapped, 'order');
    } catch (err) {
      console.error('[PL] openOrderModal error:', err);
      alert('Error: ' + err.message);
    }
  }
});

// ── Form submission ───────────────────────────────────────────────────────────
function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearFormError() {
  const el = document.getElementById('form-error');
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}
function setSubmitLoading(loading) {
  const btn = document.getElementById('order-submit-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? 'Please wait…'
    : (document.getElementById('order-form')?.dataset.mode === 'waitlist'
        ? 'Join the Waitlist <span>→</span>'
        : 'Continue to Payment <span>→</span>');
}

document.getElementById('order-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearFormError();

  const form = e.currentTarget;
  const mode = form.dataset.mode ?? 'order';
  const data = Object.fromEntries(new FormData(form));

  // Client-side presence check
  if (!data.customerName?.toString().trim()) { showFormError('Please enter your full name.'); return; }
  if (!data.email?.toString().trim()) { showFormError('Please enter your email address.'); return; }
  if (!data.phone?.toString().trim()) { showFormError('Please enter your phone number.'); return; }

  setSubmitLoading(true);

  try {
    if (mode === 'waitlist') {
      await submitWaitlist(data);
    } else {
      await submitOrder(data);
    }
  } catch (err) {
    showFormError(err.message || 'Something went wrong. Please try again.');
    setSubmitLoading(false);
  }
});

async function submitWaitlist(data) {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:        data.customerName,
      email:       data.email,
      phone:       data.phone || '',
      productCode: data.productCode,
    }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? 'Waitlist submission failed.');

  // Show success message in modal
  const form = document.getElementById('order-form');
  form.innerHTML = `<p style="font-size:16px;line-height:1.6;color:#2B2A28;padding:8px 0">
    You're on the list. We'll notify you as soon as copies become available.
  </p>`;
}

// Kick off pricing initialization and state fetch on load
initStaticPricing();
initProductState();

async function submitOrder(data) {
  console.log('Submitting order with data:', data);
  // Step 1: Create order
  const orderRes = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productCode:        data.productCode,
      customerName:       data.customerName,
      email:              data.email,
      phone:              data.phone,
      deliveryAddress:    data.deliveryAddress || undefined,
      deliveryState:      data.deliveryState || undefined,
      recipientName:      data.recipientName || undefined,
      inscriptionRequest: data.inscriptionRequest || undefined,
    }),
  });

  const orderBody = await orderRes.json();
  console.log('Order creation response:', orderBody);
  if (!orderRes.ok) throw new Error(orderBody?.error?.message ?? 'Failed to create order.');

  const { orderReference } = orderBody;

  // Step 2: Initialise Paystack payment
  console.log('Initializing Paystack payment for order:', orderReference);
  const payRes = await fetch('/api/payments/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderReference }),
  });

  const payBody = await payRes.json();
  console.log('Payment initialization response:', payBody);
  if (!payRes.ok) throw new Error(payBody?.error?.message ?? 'Payment initialisation failed.');

  if (payBody.alreadyPaid && payBody.statusUrl) {
    window.location.href = payBody.statusUrl;
    return;
  }

  // Step 3: Redirect to Paystack checkout
  console.log('Redirecting to Paystack checkout:', payBody.checkoutUrl);
  window.location.href = payBody.checkoutUrl;
}

// ── Smart mobile sticky buy bar scroll visibility controller ──────────────────
(function() {
  let lastScrollY = Math.max(0, window.scrollY || window.pageYOffset);
  const mobileBuy = document.querySelector('.mobile-buy');
  
  if (mobileBuy) {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset);
          
          // User scrolls down AND has scrolled past a buffer of 50px: hide the bar
          if (currentScrollY > lastScrollY && currentScrollY > 50) {
            mobileBuy.classList.add('mobile-buy--hidden');
          } else if (currentScrollY < lastScrollY) {
            // User scrolls up: show the bar
            mobileBuy.classList.remove('mobile-buy--hidden');
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
})();
