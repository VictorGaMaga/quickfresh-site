// QuickFresh SEO helper
// Included on: index.html, services.html, carpet-cleaning.html, rugs-cleaning.html,
// couch-sofa-cleaning.html, dining-chair-cleaning.html, mattress-cleaning.html, tile-grout-cleaning.html.
// This script only updates <head> meta/link tags and JSON-LD schema.

document.addEventListener('DOMContentLoaded', () => {
  const SITE_ORIGIN = (document.querySelector('meta[property="og:url"]')?.content || location.origin).replace(/\/$/, '');

  const normalizePath = (path) => {
    if (!path || path === '/') return '/index.html';
    if (path.endsWith('/')) return path + 'index.html';
    return path;
  };

  const pages = {
    '/index.html': {
      serviceName: null,
      serviceType: null,
      faq: []
    },
    '/services.html': {
      serviceName: null,
      serviceType: null,
      faq: []
    },
    '/carpet-cleaning.html': {
      serviceName: 'Carpet Cleaning',
      serviceType: 'Carpet Cleaning',
      faq: [
        { q: 'How long will carpets take to dry?', a: 'Dry time depends on airflow, humidity, and carpet type. Opening windows or using fans helps.' },
        { q: 'Will all stains be removed?', a: 'Results vary by stain type, dye, and age. We aim for the best improvement possible.' },
        { q: 'Is the final price confirmed on site?', a: 'Yes. We confirm access, condition, and scope before starting.' }
      ]
    },
    '/rugs-cleaning.html': {
      serviceName: 'Rug Cleaning',
      serviceType: 'Rug Cleaning',
      faq: [
        { q: 'Can I add rugs to a carpet booking?', a: 'Yes. Rugs are an on-site add-on for the same visit.' },
        { q: 'Do you clean delicate or antique rugs?', a: 'No, we only clean everyday rugs.' },
        { q: 'Is the final price confirmed on site?', a: 'Yes. We confirm size and condition before starting.' }
      ]
    },
    '/couch-sofa-cleaning.html': {
      serviceName: 'Couch & Sofa Cleaning',
      serviceType: 'Upholstery Cleaning',
      faq: [
        { q: 'How long does a couch take to dry?', a: 'Dry time depends on fabric and airflow.' },
        { q: 'Will every stain be removed?', a: 'Results vary by stain type, dye, and age.' },
        { q: 'Is the final price confirmed on site?', a: 'Yes. We confirm condition and scope before starting.' }
      ]
    },
    '/dining-chair-cleaning.html': {
      serviceName: 'Dining Chair Cleaning',
      serviceType: 'Upholstery Cleaning',
      faq: [
        { q: 'Do you clean fully upholstered chairs?', a: 'Yes, select the fully upholstered option.' },
        { q: 'How long do chairs take to dry?', a: 'Dry time depends on fabric and airflow.' },
        { q: 'Is pricing confirmed on site?', a: 'Yes. We confirm condition and scope before starting.' }
      ]
    },
    '/mattress-cleaning.html': {
      serviceName: 'Mattress Cleaning',
      serviceType: 'Mattress Cleaning',
      faq: [
        { q: 'How long does a mattress take to dry?', a: 'Dry time depends on airflow and mattress type.' },
        { q: 'Is both sides required?', a: 'No. Both sides is optional if you want a deeper clean.' },
        { q: 'Is the final price confirmed on site?', a: 'Yes. We confirm condition and access before starting.' }
      ]
    },
    '/tile-grout-cleaning.html': {
      serviceName: 'Tile & Grout Cleaning',
      serviceType: 'Tile & Grout Cleaning',
      faq: [
        { q: 'Do I need exact sqm?', a: 'No. Provide an estimate or describe the area.' },
        { q: 'Is there a minimum charge?', a: 'Yes. Minimum $200 covers up to 25 sqm.' },
        { q: 'Is the final price confirmed on site?', a: 'Yes. We confirm size and condition before starting.' }
      ]
    }
  };

  const page = pages[normalizePath(location.pathname)] || pages['/index.html'];

  // JSON-LD
  const schemaBlocks = [];
  schemaBlocks.push({
    '@context': 'https://schema.org',
    '@type': 'CleaningService',
    name: 'QuickFresh Cleaning & Care',
    url: SITE_ORIGIN + '/',
    telephone: '+61451664247',
    email: 'info@quickfresh.com.au',
    areaServed: 'Perth, WA'
  });

  if (page.serviceName) {
    schemaBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: page.serviceName,
      serviceType: page.serviceType,
      areaServed: 'Perth, WA',
      provider: {
        '@type': 'CleaningService',
        name: 'QuickFresh Cleaning & Care',
        url: SITE_ORIGIN + '/'
      }
    });
  }

  const faqVisible = document.querySelector('.seo-section details, .seo-compact details');
  if (faqVisible && page.faq && page.faq.length) {
    schemaBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a
        }
      }))
    });
  }

  document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach(el => el.remove());
  schemaBlocks.forEach((block) => {
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.setAttribute('data-seo', 'true');
    ld.textContent = JSON.stringify(block);
    document.head.appendChild(ld);
  });
});
