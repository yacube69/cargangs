exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY } = process.env;

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
    const offerLine = offer ? `<p><strong>Your offer:</strong> $${Number(offer).toLocaleString("en-US")}</p>` : "";
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "cargangs.com <hello@cargangs.com>",
        to:   [email],
        subject: "We received your inquiry — cargangs.com",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
            <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin-bottom:24px;">Domain Acquisition</p>
            <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px;">cargangs.com</h1>
            <p>Hi ${name},</p>
            <p>Thank you for your interest in acquiring <strong>cargangs.com</strong>. We have received your inquiry and will review it within the next few business days.</p>
            ${offerLine}
            <p>We will get back to you at this email address as soon as possible.</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />
            <p style="font-size:12px;color:#999;">This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error("Resend error:", emailRes.status, detail);
      // Don't fail the whole request — inquiry is already saved
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
