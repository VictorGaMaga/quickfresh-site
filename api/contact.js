// /api/contact.js
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Parse body (handles cases where body comes as a string)
    const data =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    const { mode = 'quote', estimate = {}, selections = {}, customer = {} } = data;
    const requestId =
      `QF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-` +
      Math.random().toString(36).slice(2,6).toUpperCase();
    const prefix = mode === 'quote' ? 'QF QUOTE' : 'QF BOOKING';

    // Basic validation
    const needsTotal = mode !== 'quote';
    const total = Number(estimate?.total || 0);

    if (!customer?.name || !customer?.email || (needsTotal && total <= 0)) {
      return res.status(400).json({
        ok: false,
        error: needsTotal
          ? 'Missing required fields: name, email and a non-zero total for booking.'
          : 'Missing required fields: name and email for custom quote.',
      });
    }

    // Env vars
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL;
    const TO_EMAIL = (process.env.TO_EMAIL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: 'Missing RESEND_API_KEY' });
    }
    if (!FROM_EMAIL) {
      return res.status(500).json({ ok: false, error: 'Missing FROM_EMAIL' });
    }
    if (!TO_EMAIL.length) {
      return res.status(500).json({ ok: false, error: 'TO_EMAIL not configured' });
    }

    // Build plain-text body
    const meta = data?.meta || {};
    const dateStr = new Date(meta?.timestamp || Date.now()).toLocaleString('en-AU');
    const pageRef = meta?.page || customer?.page || '-';
    const lines = [];
    const headline = mode === 'contact'
      ? 'QF CONTACT'
      : (mode === 'quote' ? 'QF QUOTE' : 'QF BOOKING');
    lines.push(`[${headline}] ${customer.name}  $${Number(estimate?.total || 0).toFixed(0)}`);
    lines.push(`Mode: ${mode}`);
    lines.push(`Page: ${pageRef}`);
    lines.push(`When: ${customer?.date || '-'}`);
    lines.push(`Submitted: ${dateStr}`);
    lines.push('--------------------------------------------------');
    lines.push('');
    lines.push(`CUSTOMER: ${customer.name} | ${customer.email} | ${customer.phone || '-'}`);
    lines.push(`ADDRESS: ${customer.address || '-'}`);
    lines.push('');
    const accessText = String(selections?.access ?? '').trim();
    const accessLines = accessText ? accessText.split(/\r?\n/) : ['-'];
    lines.push('ACCESS:');
    accessLines.forEach((line) => {
      lines.push(`  ${line || '-'}`);
    });
    lines.push('');
    const notesText = (customer?.notes ?? '').toString();
    const notesLines = notesText ? notesText.split(/\r?\n/) : ['-'];
    lines.push('NOTES:');
    notesLines.forEach((line) => {
      lines.push(`  ${line || '-'}`);
    });
    const jobText = (selections?.description ?? '').toString();
    const jobLines = jobText ? jobText.split(/\r?\n/) : ['-'];
    lines.push('JOB:');
    jobLines.forEach((line) => {
      lines.push(`  ${line || '-'}`);
    });
    lines.push('');
    const carpetRooms   = Number(selections?.carpetRooms ?? selections?.carpets ?? selections?.rooms ?? 0);
    const carpetHallway = Number(selections?.carpetHallway ?? selections?.hallway ?? 0);
    const carpetStairs  = Number(selections?.carpetStairs ?? selections?.stairs ?? 0);
    const rugTiny   = Number(selections?.rugTinyQty ?? 0);
    const rugSmall  = Number(selections?.rugSmallQty ?? 0);
    const rugMedium = Number(selections?.rugMediumQty ?? 0);
    const rugLarge  = Number(selections?.rugLargeQty ?? 0);
    const sofaSeats = Number(selections?.seats ?? 0);
    const diningQty = Number(selections?.diningQty ?? 0);
    const mSingle = Number(selections?.mSingle ?? 0);
    const mDouble = Number(selections?.mDouble ?? 0);
    const mQueen = Number(selections?.mQueen ?? 0);
    const mKing = Number(selections?.mKing ?? 0);
    lines.push('SERVICES:');
    lines.push(`  Carpet: ${carpetRooms}   Hallway: ${carpetHallway}   Stairs: ${carpetStairs}`);
    lines.push(`  Rugs: T${rugTiny} S${rugSmall} M${rugMedium} L${rugLarge}`);
    lines.push(`  Upholstery: ${sofaSeats}   Dining: ${diningQty}`);
    lines.push(`  Mattresses: S${mSingle} D${mDouble} Q${mQueen} K${mKing}`);
    lines.push(`TOTAL: $${Number(estimate?.total || 0).toFixed(0)}`);
    lines.push('');
    lines.push('ITEMS:');
    const estItems = Array.isArray(estimate?.items)
      ? estimate.items
      : (Array.isArray(estimate?.lineItems) ? estimate.lineItems : []);
    estItems.forEach((it) => {
      const qty = it?.kind === 'quote' ? '' : (it?.qty ?? '');
      const subtotal =
        it?.kind === 'quote'
          ? 'On-site quote'
          : typeof it?.subtotal === 'number'
            ? `$${Number(it.subtotal).toFixed(0)}`
            : (it?.subtotal ?? '');
      lines.push(`- ${it.label}${qty ? ` x${qty}` : ''} = ${subtotal}`);
    });
    lines.push('--------------------------------------------------');
    lines.push(`Request ID: ${requestId}`);
    const textBody = lines.join('\n');

    // Send via Resend
    const payload = {
      from: `QuickFresh <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      reply_to: customer.email,
      subject: `[${headline}] ${customer.name || customer.email || 'New message'}  ${requestId}`,
      text: textBody,
      headers: { 'X-Entity-Ref-ID': requestId },
    };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Parse error details (Resend often returns JSON)
    const ct = resp.headers.get('content-type') || '';
    const details = ct.includes('application/json')
      ? await resp.json().catch(() => null)
      : await resp.text().catch(() => '');

    if (!resp.ok) {
      console.error('Resend error:', resp.status, details);
      // Return the real status, so debugging is easier
      return res.status(resp.status).json({
        ok: false,
        error: 'Resend API error',
        details,
      });
    }

    return res.status(200).json({ ok: true, requestId });
  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Unexpected error' });
  }
}
















