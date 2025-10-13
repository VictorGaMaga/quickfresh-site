// /api/contact.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { mode, estimate, selections, customer } = data;

    if (!customer?.name || !customer?.email || !estimate?.total) {
      return res.status(400).json({ ok:false, error:'Missing required fields' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ ok:false, error:'Missing RESEND_API_KEY' });
    }

    const TO_EMAIL = (process.env.TO_EMAIL || 'quickfreshperth@gmail.com')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!TO_EMAIL.length) {
      return res.status(500).json({ ok:false, error:'TO_EMAIL not configured' });
    }

    const lines = [];
    lines.push(`New ${mode === 'book' ? 'Booking' : 'Quote'} from QuickFresh site`);
    lines.push('');
    lines.push('— Customer');
    lines.push(`Name: ${customer.name}`);
    lines.push(`Email: ${customer.email}`);
    lines.push(`Phone: ${customer.phone || '-'}`);
    lines.push(`Address: ${customer.address || '-'}`);
    lines.push(`Preferred date/time: ${customer.date || '-'}`);
    lines.push('');
    lines.push('— Selections');
    lines.push(`Carpet rooms: ${selections?.carpets ?? 0}`);
    lines.push(`Rugs: ${selections?.rugs ?? 0}`);
    lines.push(`Sofa seats: ${selections?.seats ?? 0} (double-sided: ${selections?.doubleSided ? 'yes' : 'no'}, scotch: ${selections?.scotchOpt ? 'yes' : 'no'})`);
    lines.push(`Dining chairs: ${selections?.diningQty ?? 0} (full fabric: ${selections?.diningFull ? 'yes' : 'no'})`);
    lines.push(`Mattresses: S:${selections?.mSingle ?? 0} D:${selections?.mDouble ?? 0} Q:${selections?.mQueen ?? 0} K:${selections?.mKing ?? 0} (both sides: ${selections?.mBoth ? 'yes' : 'no'}, protect: ${selections?.mProtect ? 'yes' : 'no'})`);
    lines.push(`Access: ${selections?.access || '-'}`);
    if (selections?.description) lines.push(`Notes: ${selections.description}`);
    lines.push('');
    lines.push('— Estimate breakdown');
    (estimate?.items || []).forEach(it => {
      lines.push(`${it.label}  x${it.qty}  = ${it.subtotal}`);
    });
    lines.push(`Total: $${Number(estimate.total).toFixed(0)}`);
    if (estimate?.notes) lines.push(estimate.notes);

    const textBody = lines.join('\n');

    const FROM = process.env.FROM_EMAIL || 'forms@quickfresh.com.au';

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `QuickFresh <${FROM}>`,
        to: TO_EMAIL,
        reply_to: customer.email,
        subject: `${mode === 'quote' ? 'Quote' : 'Booking'} • ${customer.name} • $${Number(estimate.total).toFixed(0)}`,
        text: textBody
      })
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(()=> '');
      console.error('Resend error:', errTxt);
      return res.status(502).json({ ok:false, error:'Resend API error', details: errTxt });
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    console.error('Handler error:', e);
    return res.status(500).json({ ok:false, error: e?.message || 'Unexpected error' });
  }
}
