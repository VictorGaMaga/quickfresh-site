/* Google Ads conversion tracking for quote-intent links (tel, WhatsApp, email). */
(function () {
  var CONVERSION_EVENT = 'conversion_event_request_quote';
  var FALLBACK_NAV_DELAY_MS = 900;
  var GOOGLE_TAG_ID = 'G-FDNZL20M0R';

  function isTrackableHref(href) {
    if (!href) return false;
    var normalized = href.trim().toLowerCase();
    return normalized.indexOf('tel:') === 0 ||
      normalized.indexOf('mailto:') === 0 ||
      normalized.indexOf('https://wa.me/') === 0 ||
      normalized.indexOf('http://wa.me/') === 0 ||
      normalized.indexOf('https://api.whatsapp.com/') === 0 ||
      normalized.indexOf('http://api.whatsapp.com/') === 0;
  }

  function fireConversion(callback) {
    ensureGoogleTag();
    if (typeof window.gtag !== 'function') {
      if (typeof callback === 'function') callback();
      return;
    }

    window.gtag('event', CONVERSION_EVENT, {
      event_callback: callback
    });
  }

  function ensureGoogleTag() {
    if (typeof window.gtag === 'function') return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_TAG_ID);

    var hasGtagScript = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (hasGtagScript) return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GOOGLE_TAG_ID);
    document.head.appendChild(script);
  }

  window.trackRequestQuoteConversion = function trackRequestQuoteConversion(url) {
    var hasNavigated = false;
    var callback = function () {
      if (hasNavigated) return;
      hasNavigated = true;
      if (typeof url !== 'undefined') {
        window.location = url;
      }
    };

    fireConversion(callback);
    if (typeof url !== 'undefined') {
      window.setTimeout(callback, FALLBACK_NAV_DELAY_MS);
    }

    return false;
  };

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var href = link.getAttribute('href');
    if (!isTrackableHref(href)) return;

    if ((link.getAttribute('target') || '').toLowerCase() === '_blank') {
      fireConversion();
      return;
    }

    event.preventDefault();
    window.trackRequestQuoteConversion(href);
  });
})();
