// ================== CONFIG (поменяем позже на данные друга) ==================
const CONFIG = {
  BRAND_TITLE: "PLAYSTORE 95",

  // Работаем через Netlify redirect proxy (/api/* -> ps-directus.onrender.com/*)
  DIRECTUS_URL: "",

  // контакты для "Купить"
  WHATSAPP_PHONE: "79635951217", // только цифры, без +
  TG_USERNAME: "SayhanK0011",    // без @ (чат в Telegram)

  PAGE_LIMIT: 20,
};
// ============================================================================

const els = {
  brandTitle: document.getElementById("brandTitle"),
  hintText: document.getElementById("hintText"),

  region: document.getElementById("region"),
  q: document.getElementById("q"),
  apply: document.getElementById("apply"),
  reset: document.getElementById("reset"),

  grid: document.getElementById("grid"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  pageLabel: document.getElementById("pageLabel"),

  // BUY MODAL (две кнопки)
  buyBackdrop: document.getElementById("buyBackdrop"),
  buyTelegram: document.getElementById("buyTelegram"),
  buyWhatsApp: document.getElementById("buyWhatsApp"),
  buyClose: document.getElementById("buyClose"),
};

els.brandTitle.textContent = CONFIG.BRAND_TITLE;

let page = 1;
let lastHadResults = false;

// хранит текст последнего "заказа" для WhatsApp
let lastBuyText = "";

function rub(n) {
  const num = Number(n || 0);
  try { return new Intl.NumberFormat("ru-RU").format(num) + " ₽"; }
  catch { return num + " ₽"; }
}

function formatDateISO(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ====== API URLs (через /api proxy) ======
function buildOfferListUrl({ region, q, page }) {
  const u = new URL(`/api/items/offers`, window.location.origin);

  u.searchParams.set("limit", String(CONFIG.PAGE_LIMIT));
  u.searchParams.set("page", String(page));

  // фильтры
  u.searchParams.set("filter[region][_eq]", region);
  u.searchParams.set("filter[in_stock][_eq]", "true");

  // не показываем пустые игры
  u.searchParams.set("filter[game][title][_nnull]", "true");

  // поиск по названию
  if (q && q.trim()) {
    u.searchParams.set("filter[game][title][_icontains]", q.trim());
  }

  // поля (важно: game.*)
  u.searchParams.set(
    "fields",
    "id,region,price_rub,discount_percent,discount_until,in_stock,game.id,game.title,game.platform,game.image"
  );

  // сортировка
  u.searchParams.set("sort", "game.title");

  return u.toString();
}

function fileUrl(fileId) {
  if (!fileId) return "";
  const u = new URL(`/api/assets/${fileId}`, window.location.origin);
  u.searchParams.set("width", "520");
  u.searchParams.set("quality", "80");
  u.searchParams.set("format", "webp"); // если вдруг не будет работать — удали эту строку
  return u.toString();
}

// ====== BUY FLOW (две кнопки: Telegram/WhatsApp) ======
function tgOpenLink(url) {
  const tg = window.Telegram?.WebApp;
  if (tg && typeof tg.openLink === "function") {
    tg.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function openWhatsApp(text) {
  const url = `https://wa.me/${CONFIG.WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  tgOpenLink(url);
}

function openTelegramChat() {
  // Просто открываем чат в Telegram (без автотекста)
  const url = `https://t.me/${CONFIG.TG_USERNAME}`;
  tgOpenLink(url);
}

function openBuyModal(text) {
  lastBuyText = text;
  if (els.buyBackdrop) els.buyBackdrop.classList.remove("hidden");
}

function closeBuyModal() {
  if (els.buyBackdrop) els.buyBackdrop.classList.add("hidden");
}

function buildBuyText({ title, region, price_rub, discount_percent, discount_until }) {
  const lines = [
    "Здравствуйте!",
    `Хочу купить игру: ${title}`,
    `Регион: ${region}`,
    `Цена: ${rub(price_rub)}`,
  ];
  if (discount_percent != null && discount_percent !== "" && Number(discount_percent) > 0) {
    lines.push(`Скидка: -${Number(discount_percent)}%`);
  }
  if (discount_until) {
    lines.push(`До: ${formatDateISO(discount_until)}`);
  }
  return lines.join("\n");
}

// ====== UI render ======
function cardHtml(offer) {
  const title = offer?.game?.title ?? "Без названия";
  const platform = offer?.game?.platform ?? "";
  const cover = fileUrl(offer?.game?.image);

  const price = offer?.price_rub ?? 0;
  const region = offer?.region ?? "";

  const discountPercent = offer?.discount_percent;
  const discountUntil = offer?.discount_until;

  const badges = [];
  if (platform) badges.push(`<div class="badge">${escapeHtml(platform)}</div>`);
  if (region) badges.push(`<div class="badge">${escapeHtml(region)}</div>`);

  if (discountPercent != null && discountPercent !== "" && Number(discountPercent) > 0) {
    badges.push(`<div class="badge badgeDanger">-${Number(discountPercent)}%</div>`);
  }
  if (discountUntil) {
    badges.push(`<div class="badge">До: ${escapeHtml(formatDateISO(discountUntil))}</div>`);
  }

  const imgBlock = cover
    ? `<div class="coverWrap">
         <img class="cover" src="${cover}" alt="" loading="lazy"
              onload="this.classList.add('loaded');"
              onerror="this.style.display='none'; this.parentElement.querySelector('.coverFallback').style.display='flex';" />
         <div class="coverFallback" style="display:none;">PLAYSTORE</div>
       </div>`
    : `<div class="coverWrap"><div class="coverFallback">PLAYSTORE</div></div>`;

  return `
    <div class="card">
      ${imgBlock}
      <div class="cardBody">
        <div class="badges">${badges.join("")}</div>
        <div class="title">${escapeHtml(title)}</div>
        <div class="priceRow">
          <div>
            <div class="price">${rub(price)}</div>
            <div class="sub">Нажми «Купить» — выбери Telegram/WhatsApp</div>
          </div>
          <button class="buyBtn" data-buy="1">Купить</button>
        </div>
      </div>
    </div>
  `;
}

function setHint(text) {
  if (els.hintText) els.hintText.textContent = text;
}

function updatePagerButtons() {
  if (els.prev) els.prev.disabled = page <= 1;
  if (els.next) els.next.disabled = lastHadResults === false && page > 1 ? true : false;
}

function renderLoading() {
  if (els.grid) els.grid.innerHTML = `<div class="sub">Загрузка...</div>`;
}

function renderEmpty() {
  if (els.grid) els.grid.innerHTML = `<div class="sub">Ничего не найдено</div>`;
}

function renderError(statusText) {
  if (!els.grid) return;
  els.grid.innerHTML = `<div class="sub">Ошибка загрузки данных${statusText ? ` (${escapeHtml(statusText)})` : ""}.</div>`;
}

async function load() {
  renderLoading();
  setHint("Загрузка…");

  const region = els.region?.value || "TR";
  const q = els.q?.value || "";

  const url = buildOfferListUrl({ region, q, page });

  try {
    const res = await fetch(url);

    if (!res.ok) {
      // таймауты/просыпание Render
      if (res.status === 504 || res.status === 502 || res.status === 503) {
        setHint("Сервер просыпается… повторяю");
        setTimeout(load, 2000);
        return;
      }

      renderError(String(res.status));
      setHint("Ошибка соединения с сервером");
      lastHadResults = false;
      updatePagerButtons();
      return;
    }

    const json = await res.json();
    const offers = json?.data ?? [];

    if (!offers.length) {
      renderEmpty();
      setHint("Данных нет по выбранным фильтрам");
      if (els.pageLabel) els.pageLabel.textContent = `Стр. ${page}`;
      lastHadResults = false;
      updatePagerButtons();
      return;
    }

    els.grid.innerHTML = offers.map(cardHtml).join("");

    // обработчики на "Купить"
    const cards = Array.from(els.grid.querySelectorAll(".card"));
    cards.forEach((card, idx) => {
      const offer = offers[idx];
      const btn = card.querySelector('[data-buy="1"]');
      if (!btn) return;

      btn.addEventListener("click", () => {
        const text = buildBuyText({
          title: offer?.game?.title ?? "Игра",
          region: offer?.region ?? region,
          price_rub: offer?.price_rub ?? 0,
          discount_percent: offer?.discount_percent ?? null,
          discount_until: offer?.discount_until ?? null,
        });

        openBuyModal(text);
      });
    });

    if (els.pageLabel) els.pageLabel.textContent = `Стр. ${page}`;
    setHint(`Показано: ${offers.length} • Регион: ${region}`);
    lastHadResults = true;
    updatePagerButtons();
  } catch (err) {
    renderError("");
    setHint("Не удалось подключиться к серверу");
    lastHadResults = false;
    updatePagerButtons();
  }
}

// UI actions
if (els.apply) els.apply.addEventListener("click", () => { page = 1; load(); });

if (els.reset) els.reset.addEventListener("click", () => {
  if (els.q) els.q.value = "";
  page = 1;
  load();
});

if (els.region) els.region.addEventListener("change", () => { page = 1; load(); });

if (els.q) els.q.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    page = 1;
    load();
  }
});

if (els.prev) els.prev.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    load();
  }
});

if (els.next) els.next.addEventListener("click", () => {
  page += 1;
  load();
});

// BUY MODAL handlers
if (els.buyTelegram) els.buyTelegram.addEventListener("click", () => {
  closeBuyModal();
  openTelegramChat();
});

if (els.buyWhatsApp) els.buyWhatsApp.addEventListener("click", () => {
  closeBuyModal();
  openWhatsApp(lastBuyText);
});

if (els.buyClose) els.buyClose.addEventListener("click", closeBuyModal);

if (els.buyBackdrop) els.buyBackdrop.addEventListener("click", (e) => {
  if (e.target === els.buyBackdrop) closeBuyModal();
});

// Telegram WebApp: немного улучшений
(function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
  } catch {}
})();

updatePagerButtons();
load();
