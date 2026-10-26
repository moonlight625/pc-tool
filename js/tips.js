// Tips／知識ページ
// tips.enc を読み込み、パスワードで復号してカテゴリごとに一覧表示。検索ボックスで絞り込み
// 復号とパスワード保持の共通処理は js/unlock.js 側にある

let tips = [];
let encPayload = null;
let tipsUnlocked = false;

async function init() {
  const res = await fetch("data/tips.enc");
  encPayload = await res.json();

  const input = document.getElementById("search-input");
  input.disabled = true;
  input.addEventListener("input", () => renderTips(input.value.trim()));

  // 同じタブ内で入力済みならパスワードを再利用する（機種一覧で入力した分も含む）
  const saved = savedPassword();
  if (saved !== null) {
    try {
      await unlockTips(saved);
    } catch (e) {
      clearSavedPassword();
    }
  }
  renderTips("");
}

// Tipsデータを復号する（失敗時は例外）
async function unlockTips(password) {
  tips = await decryptPayload(encPayload, password);
  tipsUnlocked = true;
  document.getElementById("search-input").disabled = false;
}

// URL からドメイン名だけ取り出す（不正なURLはそのまま表示）
function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return url;
  }
}

// 表の見出し・セルを1つの配列にまとめる（検索用）
function tableCells(table) {
  if (!table) return [];
  return [...(table.head || []), ...(table.rows || []).flat()].map(String);
}

function matches(tip, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    tip.title.toLowerCase().includes(q) ||
    tip.body.toLowerCase().includes(q) ||
    (tip.tags || []).some((t) => t.toLowerCase().includes(q)) ||
    tableCells(tip.table).some((c) => c.toLowerCase().includes(q))
  );
}

// table: { head: [...], rows: [[...], ...] } を表にする。セルは textContent で入れる
function renderTable(table) {
  const wrap = document.createElement("div");
  wrap.className = "tip-table-wrap";

  const el = document.createElement("table");
  el.className = "tip-table";

  if (table.head) {
    const tr = el.createTHead().insertRow();
    table.head.forEach((text) => {
      const th = document.createElement("th");
      th.textContent = text;
      tr.appendChild(th);
    });
  }

  const tbody = el.createTBody();
  (table.rows || []).forEach((row) => {
    const tr = tbody.insertRow();
    row.forEach((text) => {
      tr.insertCell().textContent = text;
    });
  });

  wrap.appendChild(el);
  return wrap;
}

function renderTips(query) {
  const container = document.getElementById("tips-list");

  if (!tipsUnlocked) {
    renderUnlockForm(container, "Tipsの表示にはパスワードが必要です", async (password) => {
      await unlockTips(password);
      renderTips(document.getElementById("search-input").value.trim());
    });
    return;
  }

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

      if (tip.table) article.appendChild(renderTable(tip.table));

      const meta = document.createElement("div");
      meta.className = "tip-meta";

      (tip.tags || []).forEach((tag) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        meta.appendChild(span);
      });

      // 出典リンク（source は文字列でも配列でも可）
      const sources = tip.source ? (Array.isArray(tip.source) ? tip.source : [tip.source]) : [];
      sources.forEach((url, i) => {
        const a = document.createElement("a");
        a.className = "tip-source";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = (i === 0 ? "出典: " : "") + hostLabel(url);
        meta.appendChild(a);
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
    "データの読み込みに失敗しました。data/tips.enc が生成済みか確認してください" +
    "（ローカル確認は python3 -m http.server で行うこと）。";
  console.error(err);
});
