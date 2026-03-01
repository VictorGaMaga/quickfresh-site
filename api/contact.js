const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return (value ?? "").toString().trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultiline(value) {
  return clean(value) || "-";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const type = clean(body.type).toLowerCase();
    const pageUrl = clean(body.pageUrl);
    const contactPref = clean(body.contactPref);
    const packageName = clean(body.packageName);
    const submittedAt = new Date().toISOString();

    if (type !== "quote" && type !== "booking") {
      return res.status(400).json({ ok: false, error: "Invalid type" });
    }

    const quoteEmail = clean(body.email);
    const quoteSuburb = clean(body.suburb);
    const quoteMessage = clean(body.message);

    const bookingName = clean(body.name);
    const bookingPhone = clean(body.phone);
    const bookingEmail = clean(body.email);
    const bookingAddress = clean(body.address);
    const bookingPreferredDateTime = clean(body.preferredDateTime);
    const bookingNotes = clean(body.notes);
    const estimateBreakdown = body.estimateBreakdown || null;

    if (type === "quote") {
      if (!EMAIL_RE.test(quoteEmail)) {
        return res.status(400).json({ ok: false, error: "Valid email is required" });
      }
      if (quoteSuburb.length < 2) {
        return res.status(400).json({ ok: false, error: "Suburb must be at least 2 characters" });
      }
      if (quoteMessage.length < 10) {
        return res.status(400).json({ ok: false, error: "Message must be at least 10 characters" });
      }
    }

    if (type === "booking") {
      if (bookingName.length < 2) {
        return res.status(400).json({ ok: false, error: "Name must be at least 2 characters" });
      }
      if (bookingPhone.length < 6) {
        return res.status(400).json({ ok: false, error: "Phone must be at least 6 characters" });
      }
      if (!EMAIL_RE.test(bookingEmail)) {
        return res.status(400).json({ ok: false, error: "Valid email is required" });
      }
      if (bookingAddress.length < 5) {
        return res.status(400).json({ ok: false, error: "Address must be at least 5 characters" });
      }
    }

    const RESEND_API_KEY = clean(process.env.RESEND_API_KEY);
    const FROM_EMAIL = clean(process.env.FROM_EMAIL);
    const TO_EMAIL = clean(process.env.TO_EMAIL);
    const missingEnvVars = [];
    if (!RESEND_API_KEY) missingEnvVars.push("RESEND_API_KEY");
    if (!FROM_EMAIL) missingEnvVars.push("FROM_EMAIL");
    if (!TO_EMAIL) missingEnvVars.push("TO_EMAIL");
    if (missingEnvVars.length) {
      console.error("Contact API missing required env vars", {
        missingEnvVars,
        handler: "api/contact.js",
      });
      return res.status(500).json({
        ok: false,
        error: "Missing required server configuration",
        code: "MISSING_ENV_VARS",
        missingEnvVars,
      });
    }

    const recipientEmail = type === "quote" ? quoteEmail : bookingEmail;
    const subjectBase = type === "quote" ? "QuickFresh Quote Request" : "QuickFresh Booking Request";
    const subject = packageName ? `${subjectBase} - ${packageName}` : subjectBase;

    const textParts = [
      `Type: ${type}`,
      `Package: ${packageName || "-"}`,
      `Contact preference: ${contactPref || "-"}`,
      `Customer email: ${recipientEmail || "-"}`,
      `Page URL: ${pageUrl || "-"}`,
      `Submitted at: ${submittedAt}`,
      "",
    ];

    if (type === "quote") {
      textParts.push(`Suburb: ${quoteSuburb || "-"}`);
      textParts.push("Quote message:");
      textParts.push(formatMultiline(quoteMessage));
    } else {
      textParts.push(`Name: ${bookingName || "-"}`);
      textParts.push(`Phone: ${bookingPhone || "-"}`);
      textParts.push(`Address: ${bookingAddress || "-"}`);
      textParts.push(`Preferred date/time: ${bookingPreferredDateTime || "-"}`);
      textParts.push("Notes:");
      textParts.push(formatMultiline(bookingNotes));
      if (estimateBreakdown) {
        textParts.push("");
        textParts.push("Estimate breakdown:");
        textParts.push(JSON.stringify(estimateBreakdown, null, 2));
      }
    }

    const htmlSections = [
      `<h2>${escapeHtml(subjectBase)}</h2>`,
      `<p><strong>Type:</strong> ${escapeHtml(type)}</p>`,
      `<p><strong>Package:</strong> ${escapeHtml(packageName || "-")}</p>`,
      `<p><strong>Contact preference:</strong> ${escapeHtml(contactPref || "-")}</p>`,
      `<p><strong>Customer email:</strong> ${escapeHtml(recipientEmail || "-")}</p>`,
      `<p><strong>Page URL:</strong> ${escapeHtml(pageUrl || "-")}</p>`,
      `<p><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>`,
    ];

    if (type === "quote") {
      htmlSections.push(`<p><strong>Suburb:</strong> ${escapeHtml(quoteSuburb || "-")}</p>`);
      htmlSections.push(`<h3>Quote message</h3><pre>${escapeHtml(quoteMessage)}</pre>`);
    } else {
      htmlSections.push(`<p><strong>Name:</strong> ${escapeHtml(bookingName || "-")}</p>`);
      htmlSections.push(`<p><strong>Phone:</strong> ${escapeHtml(bookingPhone || "-")}</p>`);
      htmlSections.push(`<p><strong>Address:</strong> ${escapeHtml(bookingAddress || "-")}</p>`);
      htmlSections.push(`<p><strong>Preferred date/time:</strong> ${escapeHtml(bookingPreferredDateTime || "-")}</p>`);
      htmlSections.push(`<h3>Notes</h3><pre>${escapeHtml(bookingNotes || "-")}</pre>`);
      if (estimateBreakdown) {
        htmlSections.push(`<h3>Estimate breakdown</h3><pre>${escapeHtml(JSON.stringify(estimateBreakdown, null, 2))}</pre>`);
      }
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        reply_to: recipientEmail,
        subject,
        text: textParts.join("\n"),
        html: htmlSections.join("\n"),
      }),
    });

    if (!resendResponse.ok) {
      const detailText = await resendResponse.text().catch(() => "");
      console.error("Resend send failed", {
        status: resendResponse.status,
        detail: detailText,
        subject,
        to: TO_EMAIL,
        replyTo: recipientEmail || null,
      });
      return res.status(500).json({
        ok: false,
        error: "Failed to send email via Resend",
        code: "RESEND_SEND_FAILED",
        status: resendResponse.status,
        detail: detailText || null,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Contact API handler error", {
      message: error?.message || String(error),
      stack: error?.stack || null,
    });
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error",
      code: "CONTACT_HANDLER_ERROR",
      detail: error?.message || null,
    });
  }
}
