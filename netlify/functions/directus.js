exports.handler = async (event) => {
  const DIRECTUS = "https://ps-directus.onrender.com";
  const path = event.queryStringParameters?.path || "/items/offers";

  const url = new URL(DIRECTUS + path);
  for (const [k, v] of Object.entries(event.queryStringParameters || {})) {
    if (k !== "path") url.searchParams.set(k, v);
  }

  try {
    const r = await fetch(url.toString(), { method: "GET" });
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
      body,
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: "upstream_failed" }) };
  }
};
