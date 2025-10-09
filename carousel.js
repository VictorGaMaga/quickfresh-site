// ── QuickFresh Carousel (standalone, v2) ─────────────────────────
(function initQuickFreshCarousel(){
  const root = document.getElementById('carousel1');
  if (!root) return;

  const track    = root.querySelector('.carousel-track');
  const slides   = Array.from(root.querySelectorAll('.carousel-slide'));
  const prevBtn  = root.querySelector('.carousel-btn.prev');
  const nextBtn  = root.querySelector('.carousel-btn.next');
  const dotsBox  = root.querySelector('.carousel-dots');
  const caption  = root.querySelector('.carousel-caption');
  const viewport = root.querySelector('.carousel-viewport') || track;

  // Guardas: se faltar estrutura, aborta silenciosamente
  if (!track || slides.length === 0 || !prevBtn || !nextBtn || !dotsBox) return;

  let idx = 0;
  let startX = 0;
  let deltaX = 0;
  let isTouching = false;
  let isAnimating = false;

  // Config base do track (garante transição suave)
  track.style.willChange = 'transform';
  track.style.transition = 'transform .35s ease-in-out';

  // Helpers ------------------------------------------------------
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function setTransform(xPx){
    // move o track em pixels relativos ao slide atual + drag
    track.style.transform = `translateX(${xPx}px)`;
  }

  function currentOffsetPx(){
    // offset ideal do slide atual (negativo)
    return -idx * viewport.clientWidth;
  }

  function update(animate = true){
    // liga/desliga animação conforme necessário
    if (!animate){
      const old = track.style.transition;
      track.style.transition = 'none';
      setTransform(currentOffsetPx());
      // força reflow e restaura
      void track.offsetHeight;
      track.style.transition = old || 'transform .35s ease-in-out';
    } else {
      setTransform(currentOffsetPx());
    }

    // dots
    dotsBox.querySelectorAll('button').forEach((b, i) =>
      b.setAttribute('aria-current', i === idx ? 'true' : 'false')
    );

    // legenda
    caption && (caption.textContent = slides[idx].dataset.caption || '');

    // vídeos: pausa os que não estão visíveis
    slides.forEach((s, i) => {
      const v = s.querySelector('video');
      if (!v) return;
      if (i === idx) { try { v.play(); } catch(_){} }
      else { v.pause(); v.currentTime = 0; }
    });
  }

  function go(n, animate = true){
    const total = slides.length;
    idx = (n + total) % total;
    update(animate);
  }

  // Dots ---------------------------------------------------------
  dotsBox.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${i+1}`);
    dot.addEventListener('click', () => go(i));
    // evita “focus outline” ficar preso no botão ao clicar
    dot.addEventListener('mousedown', e => e.preventDefault());
    dotsBox.appendChild(dot);
  });

  // Botões -------------------------------------------------------
  prevBtn.addEventListener('click', () => go(idx - 1));
  nextBtn.addEventListener('click', () => go(idx + 1));
  prevBtn.addEventListener('mousedown', e => e.preventDefault());
  nextBtn.addEventListener('mousedown', e => e.preventDefault());

  // Teclado ------------------------------------------------------
  root.setAttribute('tabindex', '0');
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  go(idx - 1);
    if (e.key === 'ArrowRight') go(idx + 1);
  });

  // Swipe touch (com follow) ------------------------------------
  viewport.addEventListener('touchstart', (e) => {
    if (isAnimating) return;
    isTouching = true;
    startX = e.touches[0].clientX;
    deltaX = 0;
    // desabilita animação durante o follow
    track.style.transition = 'none';
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    deltaX = e.touches[0].clientX - startX;

    // aplica follow com limite para não “vazar” demais
    const limit = viewport.clientWidth * 0.35;
    const dx = clamp(deltaX, -limit, limit);
    setTransform(currentOffsetPx() + dx);
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    if (!isTouching) return;
    isTouching = false;

    // restaura transição
    track.style.transition = 'transform .35s ease-in-out';

    const threshold = Math.max(60, viewport.clientWidth * 0.12); // px ou 12% da largura
    if (deltaX > threshold)      go(idx - 1);
    else if (deltaX < -threshold) go(idx + 1);
    else                         update(); // volta pro lugar
  });

  // Resize (debounce) -------------------------------------------
  let rAF = 0;
  function onResize(){
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      // ao mudar a largura do viewport, reposiciona SEM animar
      update(false);
    });
  }
  window.addEventListener('resize', onResize);

  // Atualiza quando a mídia carrega (evita “metade do slide”) ---
  // imagens
  slides.forEach(slide => {
    const img = slide.querySelector('img');
    if (img){
      if (img.complete) return; // já carregou
      img.addEventListener('load',    () => update(false), { once:true });
      img.addEventListener('error',   () => update(false), { once:true });
    }
    // vídeos
    const vid = slide.querySelector('video');
    if (vid){
      if (vid.readyState >= 1) return;
      vid.addEventListener('loadedmetadata', () => update(false), { once:true });
      vid.addEventListener('error',          () => update(false), { once:true });
    }
  });

  // Início -------------------------------------------------------
  update(false);
})();
