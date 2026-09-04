// Tips／知識ページ
// tips.json を読み込み、カテゴリごとに一覧表示。検索ボックスで絞り込み

let tips = [];

async function init() {
  const res = await fetch("data/tips.json");
  tips = await res.json();

  const input = document.getElementById("search-input");
  input.addEventListener("input", () => renderTips(input.value.trim()));

  renderTips("");
}

function matches(tip, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    tip.title.toLowerCase().includes(q) ||
    tip.body.toLowerCase().includes(q) ||
    (tip.tags || []).some((t) => t.toLowerCase().includes(q))
  );
}

function renderTips(query) {
  const container = document.getElementById("tips-list");
  container.innerHTML = "";

  const filtered = tips.filter((t) => matches(t, query));

  if (filtered.length === 0) {
    const p = document.createElement("p");
    p.className = "placeholder";
    p.textContent = "該当するTipsがありません";
    container.appendChild(p);
    return;
  }

  // カテゴリごとにグルーピング（JSON内の出現順を維持）
  const groups = new Map();
  filtered.forEach((tip) => {
    const cat = tip.category || "その他";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(tip);
  });

  groups.forEach((items, cat) => {
    const section = document.createElement("section");
    section.className = "tips-category";

    const heading = document.createElement("h2");
    heading.textContent = cat;
    section.appendChild(heading);

    items.forEach((tip) => {
      const article = document.createElement("article");
      article.className = "tip-card";

      const title = document.createElement("h3");
      title.textContent = tip.title;
      article.appendChild(title);

      const body = document.createElement("p");
      body.className = "tip-body";
      body.textContent = tip.body;
      article.appendChild(body);

      const meta = document.createElement("div");
      meta.className = "tip-meta";

      (tip.tags || []).forEach((tag) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        meta.appendChild(span);
      });

      const updated = document.createElement("span");
      updated.className = "updated";
      updated.textContent = "更新: " + (tip.updated || "-");
      meta.appendChild(updated);

      article.appendChild(meta);
      section.appendChild(article);
    });

    container.appendChild(section);
  });
}

init().catch((err) => {
  document.getElementById("tips-list").textContent =
    "データの読み込みに失敗しました。ローカル確認は python3 -m http.server で行ってください。";
  console.error(err);
});
