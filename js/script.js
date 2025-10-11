// ── QuickFresh — script.js (site base, sem carrossel) ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Footer year
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Constantes de preço
  const MIN_TOTAL = 149;
  const PRICES = {
    carpet: 50,
    rug: 40,
    scotchSeat: 10,
    scotchSeatDouble: 12,
    diningStandard: 25,
    diningFull: 30,
    mattress: { single: 80, double: 100, queen: 120, king: 140 },
    mBoth: 1.5,
    mProtect: 20
  };

  // ── Util: degrau de sofá
  function sofaPrice(seats, doubleSided){
    if (seats <= 0) return 0;
    let base = 0;
    if (seats === 1) base = 50;
    else if (seats === 2) base = 90;
    else if (seats === 3) base = 120;
    else base = 120 + (seats - 3) * 40; // 4+ seats
    if (doubleSided) base += seats * 10;
    return base;
  }

  function addRow(tbody, label, qty, cost){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${qty ?? ''}</td><td style="text-align:right">$${Number(cost || 0).toFixed(0)}</td>`;
    tbody.appendChild(tr);
  }

  // ── Cálculo (com pequena proteção se faltar elementos)
  function calc(){
    const tbody = document.querySelector('#breakdown tbody');
    if (!tbody) return 0;
    tbody.innerHTML = '';
    let total = 0;

    const val = id => {
      const el = $(id);
      if (!el) return 0;
      if (el.type === 'checkbox') return el.checked ? 1 : 0;
      const n = +el.value;
      return Number.isFinite(n) ? n : 0;
    };
    const checked = id => {
      const el = $(id);
      return !!(el && el.checked);
    };

    // Inputs
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

    if (carpets){ const c = carpets * PRICES.carpet; addRow(tbody, 'Carpeted rooms', carpets, c); total += c; }
    if (rugs){ const c = rugs * PRICES.rug; addRow(tbody, 'Rugs', rugs, c); total += c; }

    if (seats){
      const sCost = sofaPrice(seats, doubleSided);
      addRow(tbody, `Sofa (${seats} seat${seats>1?'s':''}${doubleSided?' double-sided':''})`, 1, sCost);
      total += sCost;
      if (scotchOpt){
        const sc = seats * (doubleSided ? PRICES.scotchSeatDouble : PRICES.scotchSeat);
        addRow(tbody, 'Scotchgard protection', seats, sc);
        total += sc;
      }
    }

    if (diningQty){
      const unit = diningFull ? PRICES.diningFull : PRICES.diningStandard;
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
      if (mBoth){ const extra = mTotal * (PRICES.mBoth - 1); addRow(tbody, 'Mattress both sides (+50%)', '', extra); mTotal += extra; }
      if (mProtect){ const p = mQty * PRICES.mProtect; addRow(tbody, 'Mattress protection', mQty, p); mTotal += p; }
      total += mTotal;
    }

    // Mínimo da chamada
    const minNotice = $('minNotice');
    if (total < MIN_TOTAL && total > 0){
      if (minNotice) minNotice.style.display = 'block';
      total = MIN_TOTAL;
    } else if (minNotice){
      minNotice.style.display = 'none';
    }

    // Totais
    const totalStr = `$${total.toFixed(0)}`;
    const totalEl = $('total');       if (totalEl) totalEl.textContent = totalStr;
    const stickyEl = $('stickyTotal'); if (stickyEl) stickyEl.textContent = totalStr;

    return total;
  }

  // ── Envio de e-mail (mailto)
  function sendEmail(subject, includeCustomer){
    const total = calc();
    const safe = id => (($(id) || {}).value || '').trim();

    const access = safe('access');
    const desc   = safe('description');

    const rows = Array.from(document.querySelectorAll('#breakdown tbody tr')).map(tr=>{
      const tds = tr.querySelectorAll('td');
      return `${tds[0]?.textContent || ''} — Qty: ${tds[1]?.textContent || '1'} — ${tds[2]?.textContent || ''}`;
    }).join('\n') || '(no items)';

    let body = `Estimate breakdown:\n${rows}\n\nTotal: $${total.toFixed(0)}\nAccess: ${access}\nDetails:\n${desc}\n\n(Minimum call-out fee of $149 applies. Final price confirmed on site.)`;

    if (includeCustomer){
      body += `\n\nCustomer info:\nName: ${safe('custName')}\nAddress: ${safe('custAddress')}\nPhone: ${safe('custPhone')}\nEmail: ${safe('custEmail')}\nPreferred date/time: ${safe('custDate')}`;
    }
    window.location.href = `mailto:info@quickfresh.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // ── Stepper
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
    btn.addEventListener('click', ()=>{
      step(btn.dataset.target, btn.dataset.dir);
    });
  });

  // ── Listeners de cálculo
  // (um micro-debounce pra evitar reflow excessivo em digitação)
  let calcT;
  function queueCalc(){ clearTimeout(calcT); calcT = setTimeout(calc, 10); }

  document.querySelectorAll('input, select, textarea').forEach(el=>{
    el.addEventListener('input', queueCalc);
    el.addEventListener('change', queueCalc);
  });

  // ── Toggle estimate (mobile)
  const toggleBtn = $('toggleEstimate');
  const estimateWrap = $('estimateWrap');
  if (toggleBtn && estimateWrap){
    toggleBtn.addEventListener('click', ()=>{
      const isHidden = estimateWrap.style.display === 'none';
      estimateWrap.style.display = isHidden ? '' : 'none';
    });
  }

  // ── Botões (desktop + sticky mobile)
  $$('.js-book').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const form = $('bookingForm');
      if (!form) return;
      form.style.display = 'block';
      form.scrollIntoView({behavior:'smooth'});
    });
  });
  $$('.js-book-confirm').forEach(btn=>{
    btn.addEventListener('click', ()=> sendEmail('Booking Request with Estimate', true));
  });
  $$('.js-quote').forEach(btn=>{
    btn.addEventListener('click', ()=> sendEmail('Custom Quote Request', false));
  });

  // ── Inicial
  calc();
});