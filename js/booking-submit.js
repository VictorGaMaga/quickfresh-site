(() => {
  const $ = (id) => document.getElementById(id);

  function ensureButtonTypes() {
    document.querySelectorAll('.js-book, .js-book-confirm, .js-quote, #bookConfirm, [data-action="book-confirm"]').forEach((btn) => {
      if (btn.tagName === 'BUTTON' && btn.type !== 'button') btn.type = 'button';
    });
  }

  function revealChain(el) {
    if (!el) return;
    let node = el;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('hidden')) node.classList.remove('hidden');
      const body = node.classList && node.classList.contains('toggle-body') ? node : node.closest?.('.toggle-body');
      if (body && body.style && body.style.display === 'none') body.style.display = '';
      const card = node.closest?.('.toggle-card');
      if (card && card.getAttribute('aria-expanded') !== 'true') card.setAttribute('aria-expanded', 'true');
      node = node.parentElement;
    }
  }

  function openForm() {
    const formWrap = $('bookingForm');
    if (!formWrap) return;
    formWrap.style.display = 'block';
    revealChain(formWrap);
    const email = $('custEmail');
    const name = $('custName');
    revealChain(email || name);
    (email || name)?.focus({ preventScroll: false });
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openCustomQuoteFocus() {
    const target = $('custom-quote') || $('estimate');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const quoteEmail = $('customQuoteEmail') || $('quoteEmail');
    const quoteSuburb = $('quoteSuburb');
    const quoteNotes = $('customQuoteMessage') || $('quoteDetails');
    const pref = $('contactPref');
    if (pref) pref.value = 'email';
    window.setTimeout(() => {
      const focusTarget = quoteEmail || quoteSuburb || quoteNotes;
      focusTarget?.focus({ preventScroll: true });
    }, 220);
  }

  function buildBookingPayload() {
    if (!window.QF) return null;
    const estimate = window.QF.getEstimate?.() || {};
    const selections = window.QF.getSelections?.() || {};
    const customer = window.QF.getCustomer?.() || {};

    return {
      type: 'booking',
      pageUrl: location.href,
      contactPref: $('contactPref')?.value || 'booking',
      packageName: $('package')?.value || '',
      name: (customer.name || '').trim(),
      phone: (customer.phone || '').trim(),
      email: (customer.email || '').trim(),
      address: (customer.address || '').trim(),
      preferredDateTime: (customer.date || '').trim(),
      notes: (customer.notes || selections.description || '').trim(),
      estimateBreakdown: {
        total: Number(estimate.total || 0),
        items: Array.isArray(estimate.items) ? estimate.items : [],
        minimumApplied: !!estimate.minimumApplied,
      },
    };
  }

  function validateBookingPayload(payload) {
    if (!payload) return 'Initialization error. Please reload the page.';
    if (payload.name.length < 2) return 'Please enter your full name.';
    if (payload.phone.length < 6) return 'Please enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return 'Please enter a valid email address.';
    if (payload.address.length < 5) return 'Please enter your service address.';
    return '';
  }

  async function sendBooking(button) {
    const payload = buildBookingPayload();
    const validationError = validateBookingPayload(payload);
    const statusEl = $('bookingStatus');

    if (validationError) {
      if (statusEl) {
        statusEl.textContent = validationError;
        statusEl.style.color = '#b91c1c';
      }
      openForm();
      return;
    }

    if (typeof window.submitContact === 'function') {
      await window.submitContact(payload, {
        button,
        statusEl,
        loadingText: 'Sending...',
        successText: 'Booking request sent. We will reply shortly.',
        errorPrefix: 'Could not send booking request.',
      });
      return;
    }

    const originalText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({ ok: false, error: 'Server error' }));
      if (statusEl) {
        if (response.ok && data.ok) {
          statusEl.textContent = 'Booking request sent. We will reply shortly.';
          statusEl.style.color = '#166534';
        } else {
          statusEl.textContent = `Could not send booking request. ${data.error || 'Server error'}`;
          statusEl.style.color = '#b91c1c';
        }
      }
    } catch (_err) {
      if (statusEl) {
        statusEl.textContent = 'Could not send booking request. Network error.';
        statusEl.style.color = '#b91c1c';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText || 'Confirm Booking';
      }
    }
  }

  function wireActions() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.js-book, [data-action="book-open"], #bookOpen');
      if (!el) return;
      e.preventDefault();
      openForm();
    });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('.js-book-confirm, [data-action="book-confirm"], #bookConfirm, button[name="book-confirm"]');
      if (!el) return;
      e.preventDefault();
      sendBooking(el);
    });

    document.addEventListener('click', (e) => {
      const el = e.target.closest('.js-quote, [data-action="quote"], #quoteBtn, button[name="quote"]');
      if (!el) return;
      e.preventDefault();
      openCustomQuoteFocus();
    });

    const form = $('bookingForm');
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      }, true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const hasAny = $('bookingForm') || document.querySelector('.js-book, .js-quote, .js-book-confirm, #bookOpen, #bookConfirm');
    if (!hasAny) return;
    ensureButtonTypes();
    wireActions();
  });
})();
