const CONFIG = {
  BRAND_TITLE: "PLAYSTORE 95",
  WHATSAPP_PHONE: "79635951217",
  TG_USERNAME: "xanzor",
  PAGE_LIMIT: 20,
};

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

  buyBackdrop: document.getElementById("buyBackdrop"),
  buyTelegram: document.getElementById("buyTelegram"),
  buyWhatsApp: document.getElementById("buyWhatsApp"),
  buyClose: document.getElementById("buyClose"),
  buyGameTitle: document.getElementById("buyGameTitle"),
  buyGamePrice: document.getElementById("buyGamePrice"),
};

els.brandTitle.textContent = CONFIG.BRAND_TITLE;

let page = 1;
let lastBuyText = "";

function rub(n){
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function fileUrl(id){
  return `/api/assets/${id}?width=520&quality=80`;
}

function buildUrl(){
  const u = new URL("/api/items/offers", location.origin);
  u.searchParams.set("limit", CONFIG.PAGE_LIMIT);
  u.searchParams.set("page", page);
  u.searchParams.set("filter[region][_eq]", els.region.value);
  u.searchParams.set("filter[in_stock][_eq]", "true");
  u.searchParams.set(
    "fields",
    "price_rub,region,game.title,game.platform,game.image"
  );
  return u;
}

function card(o){
  return `
  <div class="card">
    <div class="coverWrap">
      <img class="cover" src="${fileUrl(o.game.image)}">
    </div>
    <div class="cardBody">
      <div class="badges">
        <div class="badge">${o.game.platform}</div>
        <div class="badge">${o.region}</div>
      </div>
      <div class="title">${o.game.title}</div>
      <div class="priceRow">
        <div class="price">${rub(o.price_rub)}</div>
        <button class="buyBtn">Купить</button>
      </div>
    </div>
  </div>`;
}

async function load(){
  els.grid.innerHTML="Загрузка…";
  const res = await fetch(buildUrl());
  const json = await res.json();
  const data = json.data || [];

  els.grid.innerHTML = data.map(card).join("");
  els.hintText.textContent = `Показано: ${data.length} • Регион: ${els.region.value}`;
  els.pageLabel.textContent = `Стр. ${page}`;

  document.querySelectorAll(".buyBtn").forEach((b,i)=>{
    b.onclick=()=>{
      const o=data[i];
      els.buyGameTitle.textContent=o.game.title;
      els.buyGamePrice.textContent=`${rub(o.price_rub)} • ${o.region}`;
      lastBuyText=`Здравствуйте!\nХочу купить игру: ${o.game.title}\nРегион: ${o.region}\nЦена: ${rub(o.price_rub)}`;
      els.buyBackdrop.classList.remove("hidden");
    };
  });
}

els.buyClose.onclick=()=>els.buyBackdrop.classList.add("hidden");
els.buyWhatsApp.onclick=()=>location.href=`https://wa.me/${CONFIG.WHATSAPP_PHONE}?text=${encodeURIComponent(lastBuyText)}`;
els.buyTelegram.onclick=()=>location.href=`https://t.me/${CONFIG.TG_USERNAME}`;

els.apply.onclick=()=>{page=1;load();}
els.reset.onclick=()=>{els.q.value="";page=1;load();}
els.region.onchange=()=>{page=1;load();}
els.prev.onclick=()=>{if(page>1){page--;load();}}
els.next.onclick=()=>{page++;load();}

load();
