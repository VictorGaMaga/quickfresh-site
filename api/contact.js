// api/contact.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      mode, // "book" | "quote"
      estimate, // { total, items: [{label, qty, subtotal}], notes }
      selections, // o que o usuário selecionou (valores brutos)
      customer // { name,email,phone,address,date }
    } = data;

    if (!customer?.name || !customer?.email || !estimate?.total) {
      return res.status(400).json({ ok:false, error:'Missing required fields' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO_EMAIL = process.env.TO_EMAIL || 'quickfreshperth@gmail.com';
    if (!RESEND_API_KEY) return res.status(500).json({ ok:false, error:'Missing RESEND_API_KEY' });

    // monta corpo do e-mail (texto simples – robusto e legível)
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
    lines.push(`Carpet rooms: ${selections.carpets}`);
    lines.push(`Rugs: ${selections.rugs}`);
    lines.push(`Sofa seats: ${selections.seats} (double-sided: ${selections.doubleSided ? 'yes' : 'no'}, scotch: ${selections.scotchOpt ? 'yes' : 'no'})`);
    lines.push(`Dining chairs: ${selections.diningQty} (full fabric: ${selections.diningFull ? 'yes' : 'no'})`);
    lines.push(`Mattresses: S:${selections.mSingle} D:${selections.mDouble} Q:${selections.mQueen} K:${selections.mKing} (both sides: ${selections.mBoth ? 'yes' : 'no'}, protect: ${selections.mProtect ? 'yes' : 'no'})`);
    lines.push(`Access: ${selections.access}`);
    if (selections.description) lines.push(`Notes: ${selections.description}`);
    lines.push('');
    lines.push('— Estimate breakdown');
    estimate.items?.forEach(it => lines.push(`${it.label}  x${it.qty}  = ${it.subtotal}`));
    lines.push(`Total: ${estimate.total}`);
    if (estimate.notes) lines.push(estimate.notes);

    const textBody = lines.join('\n');

    // envia via API do Resend (sem dependências)
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'QuickFresh <onboarding@resend.dev>', // depois trocamos pra forms@quickfresh.com.au
        to: TO_EMAIL,
        reply_to: customer.email,
        subject: `${mode === 'book' ? 'Booking' : 'Quote'} • ${customer.name} • ${estimate.total}`,
        text: textBody
      })
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(()=> '');
      return res.status(500).json({ ok:false, error:'Send failed', details: errTxt });
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'Unexpected error' });
  }
}

