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
    const lines = [];
    lines.push(`New ${mode === 'book' ? 'Booking' : 'Quote'} from QuickFresh site`);
    lines.push('');
    lines.push('— Customer');
    lines.push(`Name: ${customer.name}`);
    lines.push(`Email: ${customer.email}`);
    lines.push(`Phone: ${customer.phone || '-'}`);
    lines.push(`Address: ${customer.address || '-'}`);
    lines.push(`Preferred date/time: ${customer.date || '-'}`);
    if (customer.notes) lines.push(`Notes (customer): ${customer.notes}`);

    lines.push('');
    lines.push('— Selections');
    lines.push(`Carpet rooms: ${selections?.carpets ?? 0}`);
    lines.push(`Rugs: ${selections?.rugs ?? 0}`);
    lines.push(
      `Sofa seats: ${selections?.seats ?? 0} (double-sided: ${
        selections?.doubleSided ? 'yes' : 'no'
      }, scotch: ${selections?.scotchOpt ? 'yes' : 'no'})`
    );
    lines.push(
      `Dining chairs: ${selections?.diningQty ?? 0} (full fabric: ${
        selections?.diningFull ? 'yes' : 'no'
      })`
    );
    lines.push(
      `Mattresses: S:${selections?.mSingle ?? 0} D:${selections?.mDouble ?? 0} Q:${
        selections?.mQueen ?? 0
      } K:${selections?.mKing ?? 0} (both sides: ${
        selections?.mBoth ? 'yes' : 'no'
      }, protect: ${selections?.mProtect ? 'yes' : 'no'})`
    );
    lines.push(`Access: ${selections?.access || '-'}`);
    if (selections?.description) lines.push(`Notes (selection): ${selections.description}`);

    lines.push('');
    lines.push('— Estimate breakdown');
    (estimate?.items || []).forEach((it) => {
      lines.push(`${it.label}  x${it.qty}  = ${it.subtotal}`);
    });
    lines.push(`Total: $${total.toFixed(0)}`);
    if (estimate?.notes) lines.push(estimate.notes);

    const textBody = lines.join('\n');

    // Send via Resend
    const payload = {
      from: `QuickFresh <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      reply_to: customer.email,
      subject: `${mode === 'quote' ? 'Quote' : 'Booking'} • ${customer.name} • $${total.toFixed(
        0
      )}`,
      text: textBody,
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

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Unexpected error' });
  }
}
