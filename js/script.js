// ── QuickFresh — script.js (global, leve e modular) ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ───────────────────────────────────────────────
  // 1. Atualiza o ano no rodapé
  // ───────────────────────────────────────────────
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ───────────────────────────────────────────────
  // 2. Ativa carrossel (se existir)
  // ───────────────────────────────────────────────
  const carouselRoot = document.querySelector('[id^="carousel"]');
  if (carouselRoot && typeof initQuickFreshCarousel === 'function') {
    // Se o carousel.js estiver carregado, inicializa manualmente
    try { initQuickFreshCarousel(); } catch (err) { console.warn('Carousel init failed:', err); }
  }

  // ───────────────────────────────────────────────
  // 3. Acessibilidade e preferências do usuário
  // ───────────────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }

  // ───────────────────────────────────────────────
  // 4. Links externos: abrem em nova aba com segurança
  // ───────────────────────────────────────────────
  $$('a[href^="http"]').forEach(link => {
    if (!link.href.includes(window.location.origin)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // ───────────────────────────────────────────────
  // 5. Header fixo em rolagem (opcional)
  // ───────────────────────────────────────────────
  const header = document.querySelector('.header');
  if (header) {
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY && y > 100) header.classList.add('header-hidden');
      else header.classList.remove('header-hidden');
      lastY = y;
    });
  }

  // ───────────────────────────────────────────────
  // 6. Suporte a animações suaves para âncoras internas
  // ───────────────────────────────────────────────
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
