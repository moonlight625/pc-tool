// data/models.src.json をパスワードで暗号化して data/models.enc を生成する
// 使い方: node tools/encrypt-models.mjs  （パスワードを対話入力）
// models.src.json は公開しないこと（.gitignore 済み）

import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "data", "models.src.json");
const OUT = join(root, "data", "models.enc");
const ITERATIONS = 310000;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("パスワード: ");
rl.close();
if (!password) {
  console.error("パスワードが空です。中止しました。");
  process.exit(1);
}

// 元データがJSONとして正しいか確認してから暗号化する
const plaintext = readFileSync(SRC, "utf8");
JSON.parse(plaintext);

const enc = new TextEncoder();
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

writeFileSync(OUT, JSON.stringify(payload));
console.log("生成しました: " + OUT);
