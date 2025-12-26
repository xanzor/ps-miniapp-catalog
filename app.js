// ====== НАСТРОЙКИ (поменяем потом на данные друга) ======
const DIRECTUS_URL = "https://ps-directus.onrender.com";
const WHATSAPP_PHONE = "79635951217";   // только цифры, без +
const TG_USERNAME = "xanzor";          // без @
// =======================================================

const LIMIT = 20;

const els = {
  region: document.getElementById("region"),
  q: document.getElementById("q"),
  apply: document.getElementById("apply"),
  grid: document.getElementById("grid"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  pageLabel: document.getElementById("pageLabel"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalText: document.getElementById("modalText"),
  buyTg: document.getElementById("buyTg"),
  buyWa: document.getElementById("buyWa"),
  closeModal: document.getElementById("closeModal"),
};

let page = 1;
let lastOpenedMessage = "";

function rub(n){
  try { return new Intl.NumberFormat("ru-RU").format(n) + " ₽"; }
  catch { return n + " ₽"; }
}

function buildOfferListUrl({ region, q, page }) {
  const u = new URL(`${DIRECTUS_URL}/items/offers`);
  u.searchParams.set("limit", String(LIMIT));
  u.searchParams.set("page", String(page));

  // фильтры
  u.searchParams.set("filter[region][_eq]", region);
  u.searchParams.set("filter[in_stock][_eq]", "true");
  u.searchParams.set("filter[game][title][_nnull]", "true"); // скрываем пустые игры

  // поиск по названию
  if (q && q.trim()) {
    // simple contains (case-insensitive) on title
    u.searchParams.set("filter[game][title][_icontains]", q.trim());
  }

  // какие поля вернуть (важно: game.*)
  u.searchParams.set("fields",
    [
      "id",
      "region",
      "price_rub",
      "discount_percent",
      "discount_until",
      "in_stock",
      "game.id",
      "game.title",
      "game.platform",
      "game.image",
    ].join(",")
  );

  // сортировка
  u.searchParams.set("sort", "game.title");

  return u.toString();
}

function fileUrl(fileId){
  if (!fileId) return "";
  return `${DIRECTUS_URL}/assets/${fileId}`;
}

function openModal(message){
  lastOpenedMessage = message;
  els.modalText.textContent = message;
  els.modalBackdrop.classList.remove("hidden");
}

function closeModal(){
  els.modalBackdrop.classList.add("hidden");
}

function openWhatsApp(text){
  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openTelegram(text){
  // t.me link (в телеграм-клиенте обычно открывается)
  const url = `https://t.me/${TG_USERNAME}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function buildBuyText({ title, region, price_rub }){
  return [
    "Здравствуйте!",
    `Хочу купить игру: ${title}`,
    `Регион: ${region}`,
    `Цена: ${rub(price_rub)}`,
  ].join("\n");
}

function cardHtml(offer){
  const title = offer?.game?.title ?? "Без названия";
  const platform = offer?.game?.platform ?? "";
  const cover = fileUrl(offer?.game?.image);
  const price = offer?.price_rub ?? 0;

  const badges = [
    platform ? `<div class="badge">${platform}</div>` : "",
    `<div class="badge">${offer.region}</div>`,
  ].filter(Boolean).join("");

  const imgTag = cover
    ? `<img class="cover" src="${cover}" alt="">`
    : `<div class="cover"></div>`;

  return `
    <div class="card">
      ${imgTag}
      <div class="cardBody">
        <div class="badges">${badges}</div>
        <div class="title">${escapeHtml(title)}</div>
        <div class="priceRow">
          <div>
            <div class="price">${rub(price)}</div>
            <div class="muted">Нажми «Купить» — откроется выбор</div>
          </div>
          <button class="buyBtn" data-buy="1">Купить</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function load(){
  els.grid.innerHTML = `<div class="muted">Загрузка...</div>`;

  const region = els.region.value;
  const q = els.q.value;

  const url = buildOfferListUrl({ region, q, page });
  console.log("FETCH URL:", url);

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HTTP ERROR:", res.status, txt);
      els.grid.innerHTML = `<div class="muted">Ошибка загрузки: ${res.status}</div>`;
      return;
    }

    const json = await res.json();
    const offers = json?.data ?? [];

    if (!offers.length) {
      els.grid.innerHTML = `<div class="muted">Ничего не найдено</div>`;
      els.pageLabel.textContent = `Стр. ${page}`;
      return;
    }

    els.grid.innerHTML = offers.map(cardHtml).join("");

    const cards = Array.from(els.grid.querySelectorAll(".card"));
    cards.forEach((card, idx) => {
      const offer = offers[idx];
      const btn = card.querySelector('[data-buy="1"]');
      btn.addEventListener("click", () => {
        const text = buildBuyText({
          title: offer?.game?.title ?? "Игра",
          region: offer?.region ?? region,
          price_rub: offer?.price_rub ?? 0,
        });
        openModal(text);
      });
    });

    els.pageLabel.textContent = `Стр. ${page}`;
  } catch (err) {
    console.error("FETCH FAILED:", err);
    els.grid.innerHTML = `<div class="muted">Не удалось загрузить данные (скорее всего CORS). Открой Console (F12) → смотри ошибку.</div>`;
  }
}


els.apply.addEventListener("click", () => { page = 1; load(); });
els.region.addEventListener("change", () => { page = 1; load(); });
els.prev.addEventListener("click", () => { if (page > 1) { page -= 1; load(); } });
els.next.addEventListener("click", () => { page += 1; load(); });

els.closeModal.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", (e) => {
  if (e.target === els.modalBackdrop) closeModal();
});

els.buyWa.addEventListener("click", () => openWhatsApp(lastOpenedMessage));
els.buyTg.addEventListener("click", () => openTelegram(lastOpenedMessage));

load();
