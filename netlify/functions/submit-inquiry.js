exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY, NOTIFY_EMAIL } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server misconfiguration." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON." }) };
  }

  const { name, email, company, offer, message } = body;

  if (!name || !email) {
    return { statusCode: 422, body: JSON.stringify({ error: "Name and email are required." }) };
  }

  // Save to Supabase
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/cargangs_com`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer":        "return=minimal",
    },
    body: JSON.stringify({ name, email, company: company || null, offer: offer || null, message: message || null }),
  });

  if (!dbRes.ok) {
    const detail = await dbRes.text();
    console.error("Supabase error:", dbRes.status, detail);
    return { statusCode: 502, body: JSON.stringify({ error: "Failed to save inquiry.", detail }) };
  }

  // Send confirmation email via Resend
  if (RESEND_API_KEY) {
    const offerRow = offer
      ? `<tr>
           <td style="padding:12px 16px;border-bottom:1px solid #222;">
             <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#666;">Your Offer</span>
           </td>
           <td style="padding:12px 16px;border-bottom:1px solid #222;text-align:right;">
             <span style="font-size:15px;font-weight:700;color:#fff;">$${Number(offer).toLocaleString("en-US")}</span>
           </td>
         </tr>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="padding-bottom:40px;border-bottom:1px solid #222;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#555;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Domain Acquisition</span>
              </td>
              <td align="right">
                <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#444;border:1px solid #2a2a2a;padding:4px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Inquiry Received</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Domain name -->
      <tr>
        <td style="padding:40px 0 32px;">
          <h1 style="margin:0;font-size:52px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1;">cargangs<span style="color:#444;">.com</span></h1>
        </td>
      </tr>

      <!-- Body text -->
      <tr>
        <td style="padding-bottom:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#aaa;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Hi ${name},</p>
          <p style="margin:0;font-size:16px;color:#aaa;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thank you for your interest in acquiring <strong style="color:#e8e8e8;">cargangs.com</strong>. We have received your inquiry and will review it within the next few business days.</p>
        </td>
      </tr>

      <!-- Summary table -->
      <tr>
        <td style="padding-bottom:40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:4px;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #222;">
                <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Domain</span>
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #222;text-align:right;">
                <span style="font-size:15px;font-weight:700;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">cargangs.com</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #222;">
                <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Name</span>
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #222;text-align:right;">
                <span style="font-size:15px;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${name}</span>
              </td>
            </tr>
            ${offerRow}
            <tr>
              <td style="padding:12px 16px;">
                <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Status</span>
              </td>
              <td style="padding:12px 16px;text-align:right;">
                <span style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#4ade80;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Under Review</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding-bottom:48px;">
          <p style="margin:0;font-size:15px;color:#666;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">We will get back to you at <strong style="color:#888;">${email}</strong> as soon as possible.</p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="border-top:1px solid #1c1c1c;padding-top:24px;">
          <p style="margin:0;font-size:11px;color:#444;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;">This is an automated confirmation. Please do not reply to this email.<br/>© 2026 cargangs.com — All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    "cargangs.com <hello@cargangs.com>",
        to:      [email],
        subject: "We received your inquiry — cargangs.com",
        html,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error("Resend error:", emailRes.status, detail);
    }

    // Internal notification
    if (NOTIFY_EMAIL) {
      const notifyRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:    "cargangs.com <hello@cargangs.com>",
          to:      [NOTIFY_EMAIL],
          subject: `${offer ? `$${Number(offer).toLocaleString("en-US")} USD — ` : ""}CARGANGS — ${name}`,
          html: `<table style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;width:100%;background:#111;border:1px solid #222;border-radius:4px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:20px 24px;border-bottom:1px solid #222;">
              <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#555;">New Inquiry — cargangs.com</span>
            </td></tr>
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#aaa;line-height:1.8;">
                <tr><td style="width:100px;color:#555;">Name</td><td style="color:#e8e8e8;">${name}</td></tr>
                <tr><td style="color:#555;">Email</td><td style="color:#e8e8e8;">${email}</td></tr>
                ${company ? `<tr><td style="color:#555;">Company</td><td style="color:#e8e8e8;">${company}</td></tr>` : ""}
                ${offer ? `<tr><td style="color:#555;">Offer</td><td style="color:#4ade80;font-weight:700;">$${Number(offer).toLocaleString("en-US")}</td></tr>` : ""}
                ${message ? `<tr><td style="color:#555;vertical-align:top;padding-top:4px;">Message</td><td style="color:#e8e8e8;">${message}</td></tr>` : ""}
              </table>
            </td></tr>
          </table>`,
        }),
      });

      if (!notifyRes.ok) {
        console.error("Notify email error:", await notifyRes.text());
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
