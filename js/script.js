// ── QuickFresh — script.js (global, leve e modular) ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const runWhenIdle = (fn) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: 1200 });
    } else {
      setTimeout(fn, 0);
    }
  };

  // ───────────────────────────────────────────────
  // 1. Atualiza o ano no rodapé
  // ───────────────────────────────────────────────
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Update legacy /booking links to the carpet quote page
  $$('a[href="/booking"], a[href="/booking/"]').forEach(link => {
    link.setAttribute('href', '/carpet-cleaning.html');
  });

  // ───────────────────────────────────────────────
  // 2. Ativa carrossel (se existir) sem competir com render inicial
  // ───────────────────────────────────────────────
  runWhenIdle(() => {
    const carouselRoot = document.querySelector('[id^="carousel"]');
    if (carouselRoot && typeof initQuickFreshCarousel === 'function') {
      try { initQuickFreshCarousel(); } catch (err) { console.warn('Carousel init failed:', err); }
    }
  });

  // ───────────────────────────────────────────────
  // 3. Acessibilidade e preferências do usuário
  // ───────────────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }

  // ───────────────────────────────────────────────
  // 4. Links externos: abrem em nova aba com segurança (idle)
  // ───────────────────────────────────────────────
  runWhenIdle(() => {
    $$('a[href^="http"]').forEach(link => {
      if (!link.href.includes(window.location.origin)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  });

  // ───────────────────────────────────────────────
  // 5. Header fixo em rolagem (opcional)
  // ───────────────────────────────────────────────
  runWhenIdle(() => {
    const header = document.querySelector('.header');
    if (!header) return;
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY && y > 100) header.classList.add('header-hidden');
      else header.classList.remove('header-hidden');
      lastY = y;
    });
  });

  // ───────────────────────────────────────────────
  // 6. Suporte a animações suaves para âncoras internas (idle)
  // ───────────────────────────────────────────────
  runWhenIdle(() => {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  });

  // 7. Accordion genérico (toggle-card) com delegação
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accordion-toggle="true"]');
    if (!btn) return;

    const id = btn.getAttribute('aria-controls');
    if (!id) return;

    const panel = document.getElementById(id);
    if (!panel) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;

    const card = btn.closest('.toggle-card');
    if (card) card.setAttribute('aria-expanded', expanded ? 'false' : 'true');

    const chevron = btn.querySelector('[data-chevron]');
    if (chevron) chevron.classList.toggle('is-open', !expanded);
  });
});
