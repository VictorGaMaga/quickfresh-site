// ── QuickFresh — SEO helper (dynamic meta & schema) ──────────────────────
document.addEventListener('DOMContentLoaded', () => {

  const PAGE = document.body.dataset.page || 'home'; // ex: <body data-page="booking">

  // 🔹 Configurações base
  const base = {
    name: 'QuickFresh — Cleaning & Care',
    url: 'https://quickfresh.com.au/',
    phone: '+61 451 664 247',
    email: 'info@quickfresh.com.au',
    logo: 'https://quickfresh.com.au/assets/logo.png',
    image: 'https://quickfresh.com.au/assets/og-cover.jpg',
    city: 'Perth',
    region: 'WA',
    country: 'AU',
    priceRange: '$$'
  };

  // 🔹 Conteúdo dinâmico por página
  const pages = {
    home: {
      title: 'QuickFresh — Carpet & Upholstery Cleaning Perth',
      description: 'Owner-operated steam cleaning in Perth. Professional, eco-friendly, insured. Minimum call-out $149.',
      type: 'HomeAndConstructionBusiness'
    },
    services: {
      title: 'Our Services — QuickFresh Steam Cleaning Perth',
      description: 'Explore our carpet, rug, couch, and mattress cleaning services. Safe for pets & families.',
      type: 'Service'
    },
    booking: {
      title: 'QuickFresh — Instant Pre-Quote & Booking',
      description: 'Hybrid form: instant estimate and booking request. Minimum call-out $149. Final price confirmed on site.',
      type: 'Offer'
    },
    terms: {
      title: 'Service Conditions & Privacy Policy — QuickFresh',
      description: 'View QuickFresh Perth’s terms, conditions, and privacy policy for all cleaning services.',
      type: 'WebPage'
    }
  };

  const meta = pages[PAGE] || pages.home;

  // === Atualiza título e descrição ===
  if (meta.title) document.title = meta.title;
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.name = 'description';
    document.head.appendChild(descTag);
  }
  descTag.content = meta.description;

  // === Open Graph / Twitter (fallback) ===
  const addMeta = (property, content, attr = 'property') => {
    if (!document.querySelector(`meta[${attr}="${property}"]`)) {
      const m = document.createElement('meta');
      m.setAttribute(attr, property);
      m.content = content;
      document.head.appendChild(m);
    }
  };
  addMeta('og:title', meta.title);
  addMeta('og:description', meta.description);
  addMeta('og:image', base.image);
  addMeta('og:type', 'website');
  addMeta('og:url', base.url + PAGE);
  addMeta('twitter:card', 'summary_large_image');
  addMeta('twitter:title', meta.title);
  addMeta('twitter:description', meta.description);

  // === JSON-LD Schema.org ===
  const schema = {
    "@context": "https://schema.org",
    "@type": meta.type || "WebPage",
    "name": meta.title,
    "description": meta.description,
    "url": base.url + (PAGE === 'home' ? '' : PAGE),
    "image": base.image,
    "telephone": base.phone,
    "email": base.email,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": base.city,
      "addressRegion": base.region,
      "addressCountry": base.country
    },
    "areaServed": ["Dianella", "Morley", "Noranda", "Nollamara", "Yokine", "Perth"]
  };

  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(ld);
});
