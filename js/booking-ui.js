// QuickFresh booking-ui.js
// Handles toggles, steppers, calculations, and estimate rendering.

(() => {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const MINIMUM_CALLOUT = window.QUICKFRESH_PRICES?.MINIMUM_CALLOUT || window.QUICKFRESH_PRICES?.MIN_TOTAL || 129;

  function getEl(id, warn = true){
    const el = $(id);
    if (!el && warn) console.warn('Missing selector:', `#${id}`);
    return el;
  }

  function toInt(value){
    const n = parseInt(value || '0', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function money(n){
    const v = Number.isFinite(n) ? Math.round(n) : 0;
    return `$${v}`;
  }

  function readInt(ids, warn = true){
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list){
      const el = getEl(id, false);
      if (el) return toInt(el.value);
    }
    if (warn && list[0]) console.warn('Missing selector:', `#${list[0]}`);
    return 0;
  }

  function readText(id){
    const el = getEl(id, false);
    return el ? String(el.value || '').trim() : '';
  }

  function readChecked(id){
    const el = getEl(id, false);
    return !!el?.checked;
  }

  function readCheckedAny(ids){
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list){
      const el = getEl(id, false);
      if (el) return !!el.checked;
    }
    return false;
  }

  function readStateFromDOM(){
    const rooms = readInt(['carpetRooms', 'carpet-rooms']);
    const hallway = readInt(['carpetHallway', 'carpet-hallway']);
    const stairs = readInt(['carpetStairs', 'carpet-stairs']);

    const rugs = {
      tiny: readInt(['rugTinyQty', 'rug-tiny'], false),
      small: readInt(['rugSmallQty', 'rug-small'], false),
      medium: readInt(['rugMediumQty', 'rug-medium'], false),
      large: readInt(['rugLargeQty', 'rug-large'], false)
    };

    const seats = readInt('seats');
    const doubleSided = readChecked('doubleSided');
    const scotchOpt = readChecked('scotchOpt');
    const diningQty = readInt('diningQty');
    const diningFull = readChecked('diningFull');

    const mSingle = readInt('mSingle');
    const mDouble = readInt('mDouble');
    const mQueen = readInt('mQueen');
    const mKing = readInt('mKing');
    const mBoth = readChecked('mBoth');
    const mProtect = readCheckedAny(['mattressProtector', 'mProtect']);

    const sqmUnknown = readChecked('tileSqmUnknown');
    const sqmRaw = Number(getEl('tileSqm', false)?.value || 0);
    const sqm = Number.isFinite(sqmRaw) && sqmRaw > 0 ? Math.floor(sqmRaw) : 0;
    const tiles = { sqm: sqmUnknown ? 0 : sqm, sqmUnknown, areaNotes: readText('tileAreaNotes') };

    const addOns = {
      specialisedTreatment: readChecked('carpetSpecialTreatmentEnabled'),
      specialisedTreatmentNotes: readText('carpetSpecialTreatmentNotes')
    };

    return {
      rooms,
      hallway,
      stairs,
      rugs,
      seats,
      doubleSided,
      scotchOpt,
      diningQty,
      diningFull,
      mSingle,
      mDouble,
      mQueen,
      mKing,
      mBoth,
      mProtect,
      tiles,
      addOns
    };
  }

  function renderEstimateTableSimple(b){
    const tbody = getEl('estimate-items');
    if (tbody){
      tbody.innerHTML = '';
      const items = b.lineItems || [];
      if (!items.length){
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="3">No items selected yet</td>';
        tbody.appendChild(tr);
      } else {
        items.forEach((item) => {
          const tr = document.createElement('tr');
          const qtyText = item.kind === 'quote' ? '' : (item.qty ?? '');
          const subtotalText = item.kind === 'quote' ? 'On-site quote' : money(item.subtotal);
          tr.innerHTML = `<td>${item.label}</td><td>${qtyText}</td><td style="text-align:right">${subtotalText}</td>`;
          tbody.appendChild(tr);
        });
      }
    }

    const totalEl = getEl('estimate-total');
    if (totalEl) totalEl.textContent = money(b.finalTotal);

    const minEl = getEl('estimate-min-msg');
    if (minEl){
      if (b.minimumApplied){
        minEl.textContent = `Minimum $${MINIMUM_CALLOUT} - $${Number(b.awayFromMinimum || 0).toFixed(0)} away`;
      } else {
        minEl.textContent = '';
      }
    }
  }

  function renderEstimateTableLegacy(b){
    const tbody = document.querySelector('#breakdown tbody');
    if (tbody){
      tbody.innerHTML = '';
      (b.breakdown || []).forEach(item => {
        const tr = document.createElement('tr');
        const subtotal = typeof item.subtotal === 'string' ? item.subtotal : money(item.subtotal || 0);
        tr.innerHTML = `<td>${item.label}</td><td>${item.qty ?? ''}</td><td style="text-align:right">${subtotal}</td>`;
        tbody.appendChild(tr);
      });
    }

    const totalEl = getEl('total', false);
    if (totalEl) totalEl.textContent = money(b.finalTotal);

    const minNotice = getEl('minNotice', false);
    if (minNotice) minNotice.style.display = b.minimumApplied ? 'block' : 'none';
  }

  function updateEstimate(){
    try {
      if (typeof window.calculateQuote !== 'function') return;
      const state = readStateFromDOM();
      const b = window.calculateQuote(state);

      if (getEl('estimate-items', false)) {
        renderEstimateTableSimple(b);
      } else {
        renderEstimateTableLegacy(b);
      }

      const stickyTotal = getEl('stickyTotal', false);
      if (stickyTotal) stickyTotal.textContent = money(b.finalTotal);
      const mobileTotal = getEl('mobile-total', false);
      if (mobileTotal) mobileTotal.textContent = money(b.finalTotal);
    } catch (err) {
      console.error('[booking-ui] updateEstimate failed', err);
    }
  }

  function waitForCalculatorAndUpdate(attempt = 0){
    if (typeof window.calculateQuote === 'function') {
      updateEstimate();
      return;
    }
    if (attempt >= 40) {
      console.warn('[booking-ui] calculateQuote not available');
      return;
    }
    setTimeout(() => waitForCalculatorAndUpdate(attempt + 1), 50);
  }

  function step(targetId, dir){
    const el = getEl(targetId, false);
    if (!el) return;
    const opts = Array.from(el.options || []).map(o => +o.value || 0);
    const hasOptions = opts.length > 0;
    const min = hasOptions ? Math.min(...opts) : (el.min ? Number(el.min) : 0);
    const max = hasOptions ? Math.max(...opts) : (el.max ? Number(el.max) : 999);
    const step = hasOptions ? 1 : (el.step ? Number(el.step) : 1);
    const cur = +el.value || 0;
    const next = Math.min(max, Math.max(min, cur + (dir === '+' ? step : -step)));
    if (next !== cur){
      el.value = String(next);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function initSteppers(){
    const steppers = $$('.stepper');
    if (!steppers.length) return;
    steppers.forEach(btn => {
      btn.addEventListener('click', () => step(btn.dataset.target, btn.dataset.dir));
    });
  }

  function initEstimate(){
    const hasEstimate = !!getEl('estimate-items', false) || !!document.querySelector('#breakdown tbody');
    if (!hasEstimate) return;

    document.addEventListener('change', (e) => {
      if (e.target.matches('select, input, textarea')) updateEstimate();
    });
    document.addEventListener('input', (e) => {
      if (e.target.matches('input[type=number], textarea')) updateEstimate();
    });

    const toggleBtn = getEl('toggleEstimate', false);
    const estimateWrap = getEl('estimateWrap', false);
    if (toggleBtn && estimateWrap){
      toggleBtn.addEventListener('click', () => {
        estimateWrap.style.display = (estimateWrap.style.display === 'none') ? '' : 'none';
      });
    }

    waitForCalculatorAndUpdate();
  }

  function initCarpetCleaning(){
    const hasCarpet = !!getEl('carpetRooms', false) || !!getEl('carpet-rooms', false);
    if (!hasCarpet) return;

    const specialCb = getEl('carpetSpecialTreatmentEnabled', false);
    if (specialCb){
      const wrap = getEl('carpetSpecialTreatmentWrap', false);
      const syncSpecial = () => {
        if (wrap) wrap.classList.toggle('hidden', !specialCb.checked);
      };
      specialCb.addEventListener('change', () => {
        syncSpecial();
        updateEstimate();
      });
      syncSpecial();
    }
  }

  function initUpholstery(){
    const hasUpholstery = !!getEl('seats', false) || !!getEl('diningQty', false);
    if (!hasUpholstery) return;

    const doubleToggle = document.querySelector('[data-double-sided-toggle]');
    const doubleCb = getEl('doubleSided', false);
    if (doubleToggle && doubleCb){
      const updateButtons = () => {
        const isDouble = !!doubleCb.checked;
        doubleToggle.querySelectorAll('[data-double-sided]').forEach((btn) => {
          const val = btn.getAttribute('data-double-sided') === 'true';
          btn.setAttribute('aria-selected', val === isDouble ? 'true' : 'false');
        });
      };
      doubleToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-double-sided]');
        if (!btn) return;
        const isDouble = btn.getAttribute('data-double-sided') === 'true';
        doubleCb.checked = isDouble;
        updateButtons();
        updateEstimate();
      });
      updateButtons();
    }
  }

  function initTileGrout(){
    const sqmUnknownCb = getEl('tileSqmUnknown', false);
    if (!sqmUnknownCb) return;
    const syncTileUnknown = () => {
      const unknown = sqmUnknownCb.checked;
      const sqmInput = getEl('tileSqm', false);
      const sqmRow = getEl('tileSqmRow', false);
      const areaWrap = getEl('tileAreaWrap', false);
      if (sqmInput) sqmInput.disabled = unknown;
      if (sqmRow) sqmRow.classList.toggle('hidden', unknown);
      if (areaWrap) areaWrap.classList.toggle('hidden', !unknown);
      if (unknown && sqmInput) sqmInput.value = '0';
    };
    sqmUnknownCb.addEventListener('change', () => {
      syncTileUnknown();
      updateEstimate();
    });
    syncTileUnknown();
  }

  function openPrimarySection(){
    const key = document.body?.dataset?.openSection;
    if (!key) return;
    const map = {
      rugs: 'rugs-content',
      sofa: 'upholstery-sofa-content',
      chairs: 'upholstery-chairs-content',
      mattress: 'mattresses-content',
      tile: 'tiles-content'
    };
    const targetId = map[key];
    if (!targetId) return;
    document.querySelectorAll('.toggle-card').forEach((card) => {
      const content = card.querySelector('[data-accordion-content]');
      if (content) content.hidden = true;
      card.setAttribute('aria-expanded', 'false');
      const btn = card.querySelector('[data-accordion-toggle=\"true\"]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    const targetContent = getEl(targetId, false);
    if (!targetContent) return;
    const card = targetContent.closest('.toggle-card');
    if (card) card.setAttribute('aria-expanded', 'true');
    targetContent.hidden = false;
    const btn = document.querySelector(`[data-accordion-toggle=\"true\"][aria-controls=\"${targetId}\"]`);
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function initUI(){
    initSteppers();
    initEstimate();
    initCarpetCleaning();
    initUpholstery();
    initTileGrout();
    openPrimarySection();

  }

  function exposeQF(){
    if (window.QF) return;
    window.QF = {
      getEstimate: () => {
        if (typeof window.calculateQuote !== 'function') return { total: 0 };
        const state = readStateFromDOM();
        const b = window.calculateQuote(state);
        return {
          total: Number(b.finalTotal || 0),
          rawSubtotal: Number(b.rawSubtotal || 0),
          minimumApplied: !!b.minimumApplied,
          items: Array.isArray(b.lineItems) ? b.lineItems : []
        };
      },
      getSelections: () => {
        const state = readStateFromDOM();
        return {
          carpetRooms: state.rooms,
          carpetHallway: state.hallway,
          carpetStairs: state.stairs,
          rugTinyQty: state.rugs.tiny,
          rugSmallQty: state.rugs.small,
          rugMediumQty: state.rugs.medium,
          rugLargeQty: state.rugs.large,
          seats: state.seats,
          doubleSided: state.doubleSided,
          scotchOpt: state.scotchOpt,
          diningQty: state.diningQty,
          diningFull: state.diningFull,
          mSingle: state.mSingle,
          mDouble: state.mDouble,
          mQueen: state.mQueen,
          mKing: state.mKing,
          mBoth: state.mBoth,
          mProtect: state.mProtect,
          tileSqm: state.tiles.sqm,
          tileSqmUnknown: state.tiles.sqmUnknown,
          tileAreaNotes: state.tiles.areaNotes,
          access: readText('access'),
          description: readText('description'),
          carpetSpecialisedTreatmentEnabled: state.addOns.specialisedTreatment,
          carpetSpecialisedTreatmentNotes: state.addOns.specialisedTreatmentNotes
        };
      },
      getCustomer: () => {
        return {
          name: readText('custName'),
          phone: readText('custPhone'),
          email: readText('custEmail'),
          address: readText('custAddress'),
          date: readText('custDate'),
          notes: readText('custNotes')
        };
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initUI();
      exposeQF();
    });
  } else {
    initUI();
    exposeQF();
  }
})();
