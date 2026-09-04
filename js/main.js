// チェックリスト画面
// pc.json を読み込んで質問を描画し、選択に応じて条件サマリーを更新する

// キー名 → 日本語表示の対応表（対応表にないキーはキー名のまま表示）
const KEY_LABELS = {
  memory_min: "メモリ（最低）",
  memory_rec: "メモリ（推奨）",
  copilot_plus: "Copilot+ PC",
  form_factor: "本体",
  office_makers: "Office",
  maker: "メーカー",
  deadline: "購入時期"
};

// 値 → 日本語表示の対応表（キーごと。未知の値はそのまま表示）
const VALUE_LABELS = {
  form_factor: { mobile: "モバイル", standard: "ノート", desktop: "デスクトップ（一体型）" },
  deadline: { today: "今日持ち帰り", soon: "1〜2週間以内", later: "いつでも・検討中" }
};

// サマリーの表示順（ここにないキーは末尾にそのまま並ぶ）
const KEY_ORDER = ["memory_min", "memory_rec", "copilot_plus", "form_factor", "office_makers", "maker", "deadline"];

let questions = [];
// 選択状態: { questionId: Set(optionId) }
const selections = {};

async function init() {
  const res = await fetch("data/pc.json");
  const data = await res.json();
  questions = data.questions;
  renderQuestions();
  document.getElementById("reset-btn").addEventListener("click", resetAll);
  renderSummary();
}

function renderQuestions() {
  const container = document.getElementById("questions");
  container.innerHTML = "";

  questions.forEach((q) => {
    selections[q.id] = new Set();

    const section = document.createElement("section");
    section.className = "question";

    const heading = document.createElement("h3");
    heading.textContent = q.label + (q.multiple ? "（複数選択可）" : "");
    section.appendChild(heading);

    const optWrap = document.createElement("div");
    optWrap.className = "options";

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt.label;
      btn.dataset.qid = q.id;
      btn.dataset.oid = opt.id;
      btn.addEventListener("click", () => toggleOption(q, opt, btn, optWrap));
      optWrap.appendChild(btn);
    });

    section.appendChild(optWrap);
    container.appendChild(section);
  });
}

function toggleOption(q, opt, btn, optWrap) {
  const sel = selections[q.id];

  if (sel.has(opt.id)) {
    sel.delete(opt.id);
    btn.classList.remove("selected");
  } else {
    if (!q.multiple) {
      // 単一選択: 同じ質問内の他の選択を解除
      sel.clear();
      optWrap.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
    }
    sel.add(opt.id);
    btn.classList.add("selected");
  }
  renderSummary();
}

function resetAll() {
  Object.keys(selections).forEach((qid) => selections[qid].clear());
  document.querySelectorAll(".option-btn.selected").forEach((b) => b.classList.remove("selected"));
  renderSummary();
}

// 選択中の全 conditions をマージする
// 数値: 最大値 / boolean: OR / 文字列: 重複したら配列にまとめる / 配列: そのまま
function mergeConditions() {
  const merged = {};

  questions.forEach((q) => {
    q.options.forEach((opt) => {
      if (!selections[q.id].has(opt.id)) return;

      Object.entries(opt.conditions).forEach(([key, value]) => {
        if (!(key in merged)) {
          merged[key] = value;
          return;
        }
        const cur = merged[key];
        if (typeof value === "number" && typeof cur === "number") {
          merged[key] = Math.max(cur, value);
        } else if (typeof value === "boolean" && typeof cur === "boolean") {
          merged[key] = cur || value;
        } else if (Array.isArray(cur) || Array.isArray(value)) {
          const arr = (Array.isArray(cur) ? cur : [cur]).slice();
          (Array.isArray(value) ? value : [value]).forEach((v) => {
            if (!arr.includes(v)) arr.push(v);
          });
          merged[key] = arr;
        } else if (cur !== value) {
          // 文字列同士の衝突（maker のような複数選択）: 配列にまとめる
          merged[key] = [cur, value];
        }
      });
    });
  });

  return merged;
}

function formatValue(key, value) {
  if (typeof value === "boolean") {
    return value ? "必要" : "不要";
  }
  if (Array.isArray(value)) {
    return value.map((v) => formatValue(key, v)).join(" / ");
  }
  if (VALUE_LABELS[key] && typeof value === "string" && value in VALUE_LABELS[key]) {
    return VALUE_LABELS[key][value];
  }
  if (typeof value === "number" && key.startsWith("memory")) {
    return value + "GB";
  }
  return String(value);
}

function renderSummary() {
  const summary = document.getElementById("summary");
  const merged = mergeConditions();
  const keys = Object.keys(merged);

  if (keys.length === 0) {
    summary.innerHTML = '<p class="placeholder">項目を選ぶとここに条件が表示されます</p>';
    return;
  }

  // KEY_ORDER の順に並べ、未知のキーは末尾に
  keys.sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a);
    const ib = KEY_ORDER.indexOf(b);
    return (ia === -1 ? KEY_ORDER.length : ia) - (ib === -1 ? KEY_ORDER.length : ib);
  });

  const table = document.createElement("table");
  table.className = "summary-table";

  // memory_min / memory_rec は1行にまとめる
  const done = new Set();
  keys.forEach((key) => {
    if (done.has(key)) return;

    let label;
    let valueText;
    if ((key === "memory_min" || key === "memory_rec") && ("memory_min" in merged || "memory_rec" in merged)) {
      label = "メモリ";
      const parts = [];
      if ("memory_min" in merged) parts.push("最低 " + merged.memory_min + "GB");
      if ("memory_rec" in merged) parts.push("推奨 " + merged.memory_rec + "GB");
      valueText = parts.join(" ／ ");
      done.add("memory_min");
      done.add("memory_rec");
    } else {
      label = KEY_LABELS[key] || key;
      valueText = formatValue(key, merged[key]);
      done.add(key);
    }

    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = valueText;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });

  summary.innerHTML = "";
  summary.appendChild(table);
}

init().catch((err) => {
  document.getElementById("questions").textContent =
    "データの読み込みに失敗しました。ローカル確認は python3 -m http.server で行ってください。";
  console.error(err);
});
