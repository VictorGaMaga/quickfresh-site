// ── QuickFresh — booking.js (refatorado e completo) ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ── Constantes de preço
  const PRICES = {
    MIN_TOTAL: 149,
    carpet: 50,
    rug: 40,
    sofa: { seat1: 50, seat2: 90, seat3: 120, extraSeat: 40, doubleSided: 10 },
    scotch: { perSeat: 10, perSeatDouble: 12 },
    dining: { standard: 25, full: 30 },
    mattress: { single: 80, double: 100, queen: 120, king: 140, bothSidesMultiplier: 1.5, protection: 20 }
  };

  // ── Função auxiliar: cálculo de sofá
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

  // ── Utilidade: adicionar linha à tabela
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
      if (mBoth){ const extra = mTotal * (PRICES.mattress.bothSidesMultiplier - 1); addRow(tbody, 'Mattress both sides (+50%)', '', extra); mTotal += extra; }
      if (mProtect){ const p = mQty * PRICES.mattress.protection; addRow(tbody, 'Mattress protection', mQty, p); mTotal += p; }
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

  // ── Envio de e-mail
  function sendEmail(subject, includeCustomer){
    const total = calc();
    const safe = id => (($(id) || {}).value || '').trim();

    const access = safe('access');
    const desc   = safe('description');
    const rows = Array.from(document.querySelectorAll('#breakdown tbody tr')).map(tr=>{
      const tds = tr.querySelectorAll('td');
      return `${tds[0]?.textContent || ''} — Qty: ${tds[1]?.textContent || '1'} — ${tds[2]?.textContent || ''}`;
    }).join('\n') || '(no items)';

    let body = `Estimate breakdown:\n${rows}\n\nTotal: $${total.toFixed(0)}\nAccess: ${access}\nDetails:\n${desc}\n\n(Minimum call-out fee of $${PRICES.MIN_TOTAL} applies. Final price confirmed on site.)`;

    if (includeCustomer){
      body += `\n\nCustomer info:\nName: ${safe('custName')}\nAddress: ${safe('custAddress')}\nPhone: ${safe('custPhone')}\nEmail: ${safe('custEmail')}\nPreferred date/time: ${safe('custDate')}`;
    }

    window.location.href = `mailto:info@quickfresh.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // ── Botões
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

  // ── Inicializa
  calc();
});
