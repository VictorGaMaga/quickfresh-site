// â”€â”€ QuickFresh â€” booking-submit.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ResponsÃ¡vel por: abrir form, validar, montar payload e enviar para a API.
// Depende de window.QF exposto por booking-ui.js.

(() => {
  const $  = (id)  => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function ensureButtonTypes(){
    document.querySelectorAll('.js-book, .js-book-confirm, .js-quote, #bookConfirm, [data-action="book-confirm"]').forEach(btn=>{
      if (btn.tagName === 'BUTTON' && btn.type !== 'button') btn.type = 'button';
    });
  }

  // â”€â”€ util: revela um elemento e seus ancestrais (expande cards/toggles)
  function revealChain(el){
    if (!el) return;
    let node = el;
    while (node && node !== document.body) {
      // remove "hidden" utilitÃ¡rio
      if (node.classList && node.classList.contains('hidden')) {
        node.classList.remove('hidden');
      }
      // se estiver dentro de uma Ã¡rea colapsÃ¡vel, mostra
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

  // abrir formulÃ¡rio (e garantir que a seÃ§Ã£o de cliente apareÃ§a)
  function openForm(e){
    const el = e?.target?.closest?.('a,button');
    if (el && el.tagName === 'A') e.preventDefault();

    const formWrap = $('bookingForm');
    if (!formWrap) return;

    // mostra o container principal do form
    formWrap.style.display = 'block';
    revealChain(formWrap);

    // garante que a sub-seÃ§Ã£o de detalhes do cliente esteja visÃ­vel
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
      alert('Initialization error. Please reload the page.');
      return;
    }
    const estimate   = window.QF.getEstimate();
    const selections = window.QF.getSelections();
    const rugTiny = Number(selections.rugTinyQty || 0);
    const rugSmall = Number(selections.rugSmallQty || 0);
    const rugMedium = Number(selections.rugMediumQty || 0);
    const rugLarge = Number(selections.rugLargeQty || 0);
    const rugTotal = rugTiny + rugSmall + rugMedium + rugLarge;
    const rugSummary = `Rugs: tiny ${rugTiny}, small ${rugSmall}, medium ${rugMedium}, large ${rugLarge} (total ${rugTotal}).`;
    const rooms = Number(selections.carpetRooms || 0);
    const special = selections.carpetSpecialisedTreatmentEnabled ? 'quoted' : 'no';
    const specialNotes = selections.carpetSpecialisedTreatmentNotes ? ` Notes: ${selections.carpetSpecialisedTreatmentNotes}` : '';
    const carpetSummary = `Carpets: ${rooms} rooms. Specialised treatment: ${special}.${specialNotes}`;
    const customer = window.QF.getCustomer();
    const estimatePayload = {
      total: Number(estimate.total || 0),
      items: Array.isArray(estimate.items) ? estimate.items : [],
      notes: estimate.minimumApplied ? `Minimum call-out applied ($${Number(estimate.total || 0)})` : ''
    };
    const payload = {
      mode,
      estimate: estimatePayload,
      selections,
      customer,
      carpetSummary,
      rugSummary,
      meta: { page: location.href, timestamp: new Date().toISOString() }
    };
    console.log('[booking-submit] submit fired', payload);
    if (mode === 'quote') {
      console.log('[booking-submit] quote notes', payload.customer?.notes, payload.selections?.description);
    }

    const needsTotal = mode !== 'quote';
    const hasTotal   = Number(estimate.total || 0) > 0;

    if (!customer.name || !customer.email || (needsTotal && !hasTotal)) {
      alert(needsTotal
        ? 'Please enter your name and email, and generate a total before confirming.'
        : 'Please enter your name and email to request a custom quote.'
      );
      openForm({ target: document.body });
      return;
    }

    const btnSend = document.activeElement;
    const prevTxt = btnSend && btnSend.textContent;
    if (btnSend) { btnSend.disabled = true; btnSend.textContent = 'Sending...'; }

    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let j;
      try { j = await r.json(); }
      catch (_e) {
        const txt = await r.text().catch(()=> '');
        console.warn('Non-JSON API response:', txt);
        j = { ok:false, error:`HTTP ${r.status}`, details: txt };
      }

      if (!r.ok || !j.ok) {
        console.error('[booking-submit] submit failed', r.status, j);
        alert(`Couldn't send: ${j.error || 'error'}. Please try again.`);
        return;
      }

      alert('Sent! We\'ll reply by email shortly.');
    } catch (err) {
      console.error('[booking-submit] network failed', err);
      alert('Couldn\'t send your request. Please try again.');
    } finally {
      if (btnSend) { btnSend.disabled = false; btnSend.textContent = prevTxt || 'Send'; }
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

    // Pedir quote (fora do form â†’ abre; dentro do form â†’ envia)
    document.addEventListener('click', (e)=>{
      const el = e.target.closest('.js-quote, [data-action="quote"], #quoteBtn, button[name="quote"]');
      if (!el) return;
      e.preventDefault();

      const insideForm = el.closest('#bookingForm');
      if (!insideForm){
        // Apenas abre o formulÃ¡rio e revela a seÃ§Ã£o de cliente
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
    const hasAny = document.getElementById('bookingForm')
      || document.querySelector('.js-book, .js-quote, .js-book-confirm, #bookOpen, #bookConfirm');
    if (!hasAny) return;
    console.log('[booking-submit] init ok');
    ensureButtonTypes();
    wireActions();
  });
})();




