  // === coleta dos valores do formulário / selects ===
function getSelections() {
  const val = id => document.getElementById(id)?.value || '0';
  const checked = id => document.getElementById(id)?.checked || false;
  return {
    carpets: +val('carpets'),
    rugs: +val('rugs'),
    seats: +val('seats'),
    doubleSided: checked('doubleSided'),
    scotchOpt: checked('scotchOpt'),
    diningQty: +val('diningQty'),
    diningFull: checked('diningFull'),
    mSingle: +val('mSingle'),
    mDouble: +val('mDouble'),
    mQueen: +val('mQueen'),
    mKing: +val('mKing'),
    mBoth: checked('mBoth'),
    mProtect: checked('mProtect'),
    access: document.getElementById('access')?.value || 'ground',
    description: document.getElementById('description')?.value?.trim() || ''
  };
}

// lê a tabela de estimate renderizada na página
function getEstimate() {
  const rows = Array.from(document.querySelectorAll('#breakdown tbody tr'));
  const items = rows.map(r => {
    const tds = r.querySelectorAll('td');
    return {
      label: (tds[0]?.textContent || '').trim(),
      qty: (tds[1]?.textContent || '').trim(),
      subtotal: (tds[2]?.textContent || '').trim()
    };
  });
  const total = (document.getElementById('total')?.textContent || '$0').trim();
  const minNotice = document.getElementById('minNotice');
  const notes = (minNotice && getComputedStyle(minNotice).display !== 'none')
    ? 'Minimum call-out fee applied: $149' : '';
  return { items, total, notes };
}

// dados do cliente (booking form)
function getCustomer() {
  const g = id => document.getElementById(id)?.value?.trim() || '';
  return {
    name: g('custName'),
    phone: g('custPhone'),
    email: g('custEmail'),
    address: g('custAddress'),
    date: g('custDate')
  };
}

async function sendBookingOrQuote(mode) {
  const statusEl = document.getElementById('sendStatus');
  if (statusEl) statusEl.textContent = 'Sending…';

  const payload = {
    mode, // "book" | "quote"
    selections: getSelections(),
    estimate: getEstimate(),
    customer: getCustomer()
  };

  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error(await resp.text());

    if (statusEl) statusEl.textContent = 'Thanks! We received your request and will respond shortly.';
    // opcional: rolar pro topo ou limpar formulário
    // document.getElementById('bookingForm').style.display = 'none';
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Sorry, we could not send your request. Please try again.';
    console.error(err);
  }
}

// mostra o form ao clicar nos botões principais
document.querySelectorAll('.js-book').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('bookingForm').style.display = 'block';
    // opcional: marcar modo atual
    document.getElementById('bookingForm').dataset.mode = 'book';
    document.getElementById('sendStatus').textContent = '';
  });
});

document.querySelectorAll('.js-quote').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('bookingForm').dataset.mode = 'quote';
    document.getElementById('sendStatus').textContent = '';
  });
});

// botão final “Confirm Booking”
const confirmBtn = document.querySelector('.js-book-confirm');
if (confirmBtn) {
  confirmBtn.addEventListener('click', () => {
    const mode = document.getElementById('bookingForm').dataset.mode || 'book';
    sendBookingOrQuote(mode);
  });
}