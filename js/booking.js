// ── QuickFresh — booking.js (usa prices.js) ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.info('[booking.js] DOM pronto');

  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // util: delegação robusta
  function on(event, selectorList, handler){
    const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
    document.addEventListener(event, (e) => {
      const target = selectors
        .map(sel => e.target.closest(sel))
        .find(el => !!el && document.contains(el));
      if (!target) return;
      handler(e, target);
    });
  }

  // ── Preços vindos de prices.js (com fallback seguro em dev)
  const DEFAULT_PRICES = {
    MIN_TOTAL: 149,
    carpet: 50,
    rug: 40,
    sofa: { seat1: 50, seat2: 90, seat3: 120, extraSeat: 40, doubleSided: 10 },
    scotch: { perSeat: 10, perSeatDouble: 12 },
    dining: { standard: 25, full: 30 },
    mattress: { single: 80, double: 100, queen: 120, king: 140, bothSidesMultiplier: 1.5, protection: 20 }
  };
  const PRICES = (window && window.QUICKFRESH_PRICES) ? window.QUICKFRESH_PRICES : DEFAULT_PRICES;
  if (!window.QUICKFRESH_PRICES) console.warn('[booking.js] QUICKFRESH_PRICES não encontrado. Usando fallback.');

  // ── Cálculo de sofá
  function sofaPrice(seats, doubleSided){
    if (seats <= 0) return 0;
    let base = 0;
    if (seats === 1) base = PRICES.sofa.seat1;
    else if (seats === 2) base = PRICES.sofa.seat2;
    else if (seats === 3) base = PRICES.sofa.seat3;
    else base = PRICES.sofa.seat3 + (seats - 3) * PRICES.sofa.extraSeat;
    if (doubleSided) base += seats * PRICES.sofa.doubleSided;
    return base;
  }

  // ── Adiciona linha no breakdown
  function addRow(tbody, label, qty, cost){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${qty ?? ''}</td><td style="text-align:right">$${Number(cost || 0).toFixed(0)}</td>`;
    tbody.appendChild(tr);
  }

  // ── Cálculo total
  function calc(){
    const tbody = document.querySelector('#breakdown tbody');
    if (!tbody) return 0;
    tbody.innerHTML = '';
    let total = 0;

    const val = id => +($(id)?.value || 0);
    const checked = id => !!($(id)?.checked);

    // Coleta
    const carpets = val('carpets');
    const rugs = val('rugs');
    const seats = val('seats');
    const doubleSided = checked('doubleSided');
    const scotchOpt = checked('scotchOpt');
    const diningQty = val('diningQty');
    const diningFull = checked('diningFull');
    const mSingle = val('mSingle');
    const mDouble = val('mDouble');
    const mQueen  = val('mQueen');
    const mKing   = val('mKing');
    const mBoth   = checked('mBoth');
    const mProtect= checked('mProtect');

    // Carpet & rugs
    if (carpets){ const c = carpets * PRICES.carpet; addRow(tbody, 'Carpeted rooms', carpets, c); total += c; }
    if (rugs){ const c = rugs * PRICES.rug; addRow(tbody, 'Rugs', rugs, c); total += c; }

    // Sofas
    if (seats){
      const sCost = sofaPrice(seats, doubleSided);
      addRow(tbody, `Sofa (${seats} seat${seats>1?'s':''}${doubleSided?' double-sided':''})`, 1, sCost);
      total += sCost;
      if (scotchOpt){
        const sc = seats * (doubleSided ? PRICES.scotch.perSeatDouble : PRICES.scotch.perSeat);
        addRow(tbody, 'Scotchgard protection', seats, sc);
        total += sc;
      }
    }

    // Dining
    if (diningQty){
      const unit = diningFull ? PRICES.dining.full : PRICES.dining.standard;
      addRow(tbody, `Dining chairs${diningFull ? ' (full fabric)' : ''}`, diningQty, diningQty * unit);
      total += diningQty * unit;
    }

    // Mattresses
    const mRows = [
      ['Single mattress', mSingle, PRICES.mattress.single],
      ['Double mattress', mDouble, PRICES.mattress.double],
      ['Queen mattress',  mQueen,  PRICES.mattress.queen],
      ['King mattress',   mKing,   PRICES.mattress.king]
    ].filter(r => r[1] > 0);

    let mTotal = 0, mQty = 0;
    mRows.forEach(([label, qty, price])=>{
      const cost = qty * price;
      addRow(tbody, label, qty, cost);
      mTotal += cost; mQty += qty;
    });

    if (mRows.length){
      if (mBoth){
        const extra = mTotal * (PRICES.mattress.bothSidesMultiplier - 1);
        addRow(tbody, 'Mattress both sides (+50%)', '', extra);
        mTotal += extra;
      }
      if (mProtect){
        const p = mQty * PRICES.mattress.protection;
        addRow(tbody, 'Mattress protection', mQty, p);
        mTotal += p;
      }
      total += mTotal;
    }

    // Mínimo
    const minNotice = $('minNotice');
    if (total < PRICES.MIN_TOTAL && total > 0){
      if (minNotice) minNotice.style.display = 'block';
      total = PRICES.MIN_TOTAL;
    } else if (minNotice){
      minNotice.style.display = 'none';
    }

    // Totais
    const totalStr = `$${total.toFixed(0)}`;
    if ($('total')) $('total').textContent = totalStr;
    if ($('stickyTotal')) $('stickyTotal').textContent = totalStr;

    return total;
  }

  // ── Stepper (+/−)
  function step(targetId, dir){
    const el = $(targetId);
    if (!el) return;
    const opts = Array.from(el.options || []).map(o => +o.value || 0);
    const max = opts.length ? Math.max(...opts) : 99;
    const min = opts.length ? Math.min(...opts) : 0;
    const cur = +el.value || 0;
    const next = Math.min(max, Math.max(min, cur + (dir === '+' ? 1 : -1)));
    if (next !== cur){ el.value = String(next); el.dispatchEvent(new Event('change', {bubbles:true})); }
  }
  $$('.stepper').forEach(btn=>{
    btn.addEventListener('click', ()=> step(btn.dataset.target, btn.dataset.dir));
  });

  // ── Atualização automática
  let calcT;
  function queueCalc(){ clearTimeout(calcT); calcT = setTimeout(calc, 10); }
  document.querySelectorAll('input, select, textarea').forEach(el=>{
    el.addEventListener('input', queueCalc);
    el.addEventListener('change', queueCalc);
  });

  // ── Toggle (mobile)
  const toggleBtn = $('toggleEstimate');
  const estimateWrap = $('estimateWrap');
  if (toggleBtn && estimateWrap){
    toggleBtn.addEventListener('click', ()=>{
      estimateWrap.style.display = (estimateWrap.style.display === 'none') ? '' : 'none';
    });
  }

  // ── Envio / API
  async function submitContact(mode){
    const totalNow = calc();
    const safe = id => (($(id) || {}).value || '').trim();
    const num  = id => +((($(id) || {}).value) || 0);
    const chk  = id => !!($(id)?.checked);

    const items = Array.from(document.querySelectorAll('#breakdown tbody tr')).map(tr=>{
      const tds = tr.querySelectorAll('td');
      return {
        label: (tds[0]?.textContent || '').trim(),
        qty:   (tds[1]?.textContent || '').trim() || '1',
        subtotal: (tds[2]?.textContent || '').trim()
      };
    });

    const estimate = {
      total: totalNow,
      items,
      notes: `(Minimum call-out $${(PRICES?.MIN_TOTAL ?? 149)})`
    };

    const selections = {
      carpets: num('carpets'),
      rugs: num('rugs'),
      seats: num('seats'),
      doubleSided: chk('doubleSided'),
      scotchOpt: chk('scotchOpt'),
      diningQty: num('diningQty'),
      diningFull: chk('diningFull'),
      mSingle: num('mSingle'),
      mDouble: num('mDouble'),
      mQueen:  num('mQueen'),
      mKing:   num('mKing'),
      mBoth:   chk('mBoth'),
      mProtect:chk('mProtect'),
      access: safe('access'),
      description: safe('description')
    };

    const customer = {
      name: safe('custName'),
      email: safe('custEmail'),
      phone: safe('custPhone'),
      address: safe('custAddress'),
      date: safe('custDate')
    };

    if (!customer.name || !customer.email || !estimate.total) {
      alert('Por favor, preencha nome, e-mail e gere um total.');
      return;
    }

    // feedback visual no botão clicado (se houver)
    const btnSend = document.activeElement;
    const prevTxt = btnSend && btnSend.textContent;
    if (btnSend) { btnSend.disabled = true; btnSend.textContent = 'Enviando...'; }

    try {
      const r = await fetch('/api/contact', {
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

  // ── Evitar submit/reload de qualquer form
  const form = $('bookingForm');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.info('[booking.js] submit prevenido');
    }, true);
  } else {
    console.warn('[booking.js] #bookingForm não encontrado');
  }

  // ── Força botões a type="button" se não estiverem
  document.querySelectorAll('.js-book, .js-book-confirm, .js-quote, #bookConfirm, [data-action="book-confirm"]').forEach(btn=>{
    if (btn.tagName === 'BUTTON' && btn.type !== 'button') btn.type = 'button';
  });

  // ── Delegação: abre formulário
  on('click', ['.js-book', '[data-action="book-open"]', '#bookOpen'], (e) => {
    const el = e.target.closest('a,button');
    if (el && el.tagName === 'A') e.preventDefault();
    console.info('[booking.js] click abrir form');
    const f = $('bookingForm');
    if (!f) return;
    f.style.display = 'block';
    f.scrollIntoView({behavior:'smooth'});
  });

  // ── Delegação: confirmar booking
  on('click', ['.js-book-confirm', '[data-action="book-confirm"]', '#bookConfirm', 'button[name="book-confirm"]'], (e) => {
    const el = e.target.closest('a,button');
    if (el && el.tagName === 'A') e.preventDefault();
    console.info('[booking.js] click BOOK CONFIRM');
    submitContact('book');
  });

  // ── Delegação: pedir quote
  on('click', ['.js-quote', '[data-action="quote"]', '#quoteBtn', 'button[name="quote"]'], (e) => {
    const el = e.target.closest('a,button');
    if (el && el.tagName === 'A') e.preventDefault();
    console.info('[booking.js] click QUOTE');
    submitContact('quote');
  });

  // ── Inicializa
  calc();

  // Diagnóstico
  const counts = {
    book: $$('.js-book, [data-action="book-open"], #bookOpen').length,
    confirm: $$('.js-book-confirm, [data-action="book-confirm"], #bookConfirm, button[name="book-confirm"]').length,
    quote: $$('.js-quote, [data-action="quote"], #quoteBtn, button[name="quote"]').length
  };
  console.info('[booking.js] botões detectados:', counts);
});
