// 暗号化データ（data/*.enc）の復号とパスワード入力フォームの共通処理
// index.html（機種一覧）と tips.html（Tips）の両方から読み込む

// 同じタブ内ならパスワードを使い回す。機種一覧とTipsで共通のキーを使うので、
// どちらかで一度入力すれば、同じタブ内のもう一方も自動で解錠される
const PW_STORAGE_KEY = "pc-tool-pw";

function savedPassword() {
  return sessionStorage.getItem(PW_STORAGE_KEY);
}

function savePassword(password) {
  sessionStorage.setItem(PW_STORAGE_KEY, password);
}

function clearSavedPassword() {
  sessionStorage.removeItem(PW_STORAGE_KEY);
}

// パスワードから鍵を導出して暗号化ペイロードを復号する（失敗時は例外）
async function decryptPayload(payload, password) {
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(payload.salt), iterations: payload.iter, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64(payload.iv) }, key, b64(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

// パスワード入力フォームを container に描画する
// onUnlock(password) は解錠を試みる関数。例外を投げたら「パスワードが違います」を表示する
function renderUnlockForm(container, message, onUnlock) {
  if (container.querySelector(".unlock-form")) return; // 入力中は作り直さない

  container.innerHTML = "";

  const form = document.createElement("form");
  form.className = "unlock-form";

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "パスワード";
  input.autocomplete = "off";
  form.appendChild(input);

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "copy-btn";
  btn.textContent = "表示";
  form.appendChild(btn);

  const msg = document.createElement("p");
  msg.className = "placeholder unlock-msg";
  msg.textContent = message;

  container.appendChild(form);
  container.appendChild(msg);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      await onUnlock(input.value);
      savePassword(input.value);
    } catch (err) {
      msg.textContent = "パスワードが違います";
      btn.disabled = false;
    }
  });
}
