// 非公開データ（*.src.json）をパスワードで暗号化して *.enc を生成する
// 使い方: node tools/encrypt-data.mjs  （パスワードを対話入力）
//
// 機種一覧（models）とTips（tips）を同じパスワードで一度に暗号化する。
// 同じパスワードにしておくことで、ブラウザ側は一度の入力で両方を解錠できる。
// *.src.json は公開しないこと（.gitignore 済み）

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ITERATIONS = 310000;

// [元ファイル, 出力ファイル] の組。増やすときはここに追記する
const TARGETS = [
  ["models.src.json", "models.enc"],
  ["tips.src.json", "tips.enc"]
];

// 端末から実行されていないとキーボード入力が繋がらず、対話入力が黙って失敗する
// （Claude Code の ! から実行した場合など）。パイプで渡された場合だけは受け付ける
let password = "";
if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("パスワード: ");
  rl.close();
} else {
  try {
    password = readFileSync(0, "utf8").trim();
  } catch (e) {
    password = "";
  }
}
if (!password) {
  console.error("パスワードが入力されませんでした。中止しました。");
  if (!process.stdin.isTTY) {
    console.error("キーボード入力が繋がらない環境です。ターミナルで直接実行してください:");
    console.error("  cd " + root + " && node tools/encrypt-data.mjs");
  }
  process.exit(1);
}

const enc = new TextEncoder();

// 暗号化前に全ファイルの存在とJSONの妥当性を確認する（途中で失敗して片方だけ古いまま、を防ぐ）
const jobs = TARGETS.map(([src, out]) => {
  const srcPath = join(root, "data", src);
  if (!existsSync(srcPath)) {
    console.error(`元ファイルが見つかりません: ${srcPath}`);
    process.exit(1);
  }
  const plaintext = readFileSync(srcPath, "utf8");
  try {
    JSON.parse(plaintext);
  } catch (e) {
    console.error(`JSONとして読めません: ${srcPath}\n${e.message}`);
    process.exit(1);
  }
  return { plaintext, outPath: join(root, "data", out) };
});

for (const { plaintext, outPath } of jobs) {
  // salt と iv はファイルごとに新しく生成する
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(plaintext)
  );

  const b64 = (buf) => Buffer.from(buf).toString("base64");
  const payload = {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: ITERATIONS,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(cipher)
  };

  writeFileSync(outPath, JSON.stringify(payload));
  console.log("生成しました: " + outPath);
}
