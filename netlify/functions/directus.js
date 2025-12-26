exports.handler = async (event) => {
  const DIRECTUS = "https://ps-directus.onrender.com";

  const path = event.queryStringParameters?.path || "/items/offers";
  const url = new URL(DIRECTUS + path);

  // прокидываем все query-параметры (кроме path)
  for (const [k, v] of Object.entries(event.queryStringParameters || {})) {
    if (k !== "path") url.searchParams.set(k, v);
  }

  try {
    const r = await fetch(url.toString(), { method: "GET" });
    const text = await r.text();
    return {
      statusCode: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" },
      body: text,
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "proxy_failed" }) };
  }
};
