exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cargangs_com`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer":        "return=minimal",
    },
    body: JSON.stringify({ name, email, company: company || null, offer: offer || null, message: message || null }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Supabase error:", res.status, detail);
    return { statusCode: 502, body: JSON.stringify({ error: "Failed to save inquiry.", detail }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
