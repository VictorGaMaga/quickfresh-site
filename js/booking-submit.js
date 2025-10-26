// ── QuickFresh — booking-submit.js ──────────────────────────────────────
// Responsável por: abrir form, validar, montar payload e enviar para a API.
// Depende de window.QF exposto por booking-ui.js.

(() => {
  const $  = (id)  => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function ensureButtonTypes(){
    document.querySelectorAll('.js-book, .js-book-confirm, .js-quote, #bookConfirm, [data-action="book-confirm"]').forEach(btn=>{
      if (btn.tagName === 'BUTTON' && btn.type !== 'button') btn.type = 'button';
    });
  }

  // ── util: revela um elemento e seus ancestrais (expande cards/toggles)
  function revealChain(el){
    if (!el) return;
    let node = el;
    while (node && node !== document.body) {
      // remove "hidden" utilitário
      if (node.classList && node.classList.contains('hidden')) {
        node.classList.remove('hidden');
      }
      // se estiver dentro de uma área colapsável, mostra
      const body = node.classList && node.classList.contains('toggle-body') ? node : node.closest?.('.toggle-body');
      if (body && body.style && body.style.display === 'none') {
        body.style.display = '';
      }
      // expande o card pai
      const card = node.closest?.('.toggle-card');
      if (card && card.getAttribute('aria-expanded') !== 'true') {
        card.setAttribute('aria-expanded','true');
      }
      node = node.parentElement;
    }
  }

  // abrir formulário (e garantir que a seção de cliente apareça)
  function openForm(e){
    const el = e?.target?.closest?.('a,button');
    if (el && el.tagName === 'A') e.preventDefault();

    const formWrap = $('bookingForm');
    if (!formWrap) return;

    // mostra o container principal do form
    formWrap.style.display = 'block';
    revealChain(formWrap);

    // garante que a sub-seção de detalhes do cliente esteja visível
    const email = $('custEmail');
    const name  = $('custName');
    // revela cadeia acima dos inputs
    revealChain(email || name);

    // scroll + foco
    (email || name)?.focus({ preventScroll: false });
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitContact(mode){
    if (!window.QF){
      alert('Erro de inicialização. Recarregue a página.');
      return;
    }
    const estimate   = window.QF.getEstimate();   // força calc e lê tabela
    const selections = window.QF.getSelections();
    const customer   = window.QF.getCustomer();

    // Para QUOTE não exigimos total > 0; para BOOK exigimos.
    const needsTotal = mode !== 'quote';
    const hasTotal   = Number(estimate.total || 0) > 0;

    if (!customer.name || !customer.email || (needsTotal && !hasTotal)) {
      alert(needsTotal
        ? 'Por favor, preencha nome, e-mail e gere um total.'
        : 'Para solicitar uma cotação personalizada, preencha nome e e-mail (o total pode ficar em $0).'
      );
      // garante que a seção de cliente esteja visível quando a validação falhar
      openForm({ target: document.body });
      return;
    }

    // feedback no botão ativo
    const btnSend = document.activeElement;
    const prevTxt = btnSend && btnSend.textContent;
    if (btnSend) { btnSend.disabled = true; btnSend.textContent = 'Enviando...'; }

    try {
      // caminho relativo resiliente: funciona em / e em /html/*
      const apiPath = (location.pathname.startsWith('/html/') || location.pathname.endsWith('.html'))
        ? '../api/contact'
        : 'api/contact';

      const r = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, estimate, selections, customer })
      });

      let j;
      try { j = await r.json(); }
      catch (_e) {
        const txt = await r.text().catch(()=> '');
        console.warn('Resposta não-JSON da API:', txt);
        j = { ok:false, error:`HTTP ${r.status}`, details: txt };
      }

      if (!r.ok || !j.ok) {
        console.error('Falha API /api/contact:', j);
        alert(`Não consegui enviar (${j.error || 'erro'}). Tente novamente em instantes.`);
        return;
      }

      alert('Enviado! Vamos responder por e-mail em breve.');
    } catch (err) {
      console.error('Falha de rede ao enviar:', err);
      alert('Falha de rede. Verifique sua conexão e tente novamente.');
    } finally {
      if (btnSend) { btnSend.disabled = false; btnSend.textContent = prevTxt || 'Enviar'; }
    }
  }

  function wireActions(){
    // Abrir form (Book with Estimate)
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('.js-book, [data-action="book-open"], #bookOpen');
      if (!el) return;
      e.preventDefault();
      openForm(e);
    });

    // Confirmar booking (enviar)
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('.js-book-confirm, [data-action="book-confirm"], #bookConfirm, button[name="book-confirm"]');
      if (!el) return;
      e.preventDefault();
      submitContact('book');
    });

    // Pedir quote (fora do form → abre; dentro do form → envia)
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('.js-quote, [data-action="quote"], #quoteBtn, button[name="quote"]');
      if (!el) return;
      e.preventDefault();

      const insideForm = el.closest('#bookingForm');
      if (!insideForm){
        // Apenas abre o formulário e revela a seção de cliente
        openForm(e);
        return;
      }
      submitContact('quote');
    });

    // prevenir submit/reload em #bookingForm
    const form = $('bookingForm');
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        console.info('[booking-submit] submit prevenido');
      }, true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.info('[booking-submit] init');
    ensureButtonTypes();
    wireActions();
  });
})();
