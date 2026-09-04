// 改善要望フォーム: Discord webhook に送信する

// Discord webhook URL（管理人から受領後に設定する）
const WEBHOOK_URL = "https://discord.com/api/webhooks/1545413712528023582/r_Y9eq7dEh-1EI66o8sY5LiA_nEt4Ha4lqcmlSHimKWFD_VNiurhkDMxBZI96Jw5fHq-";

const form = document.getElementById("request-form");
const sendBtn = document.getElementById("send-btn");
const result = document.getElementById("send-result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("req-name").value.trim();
  const body = document.getElementById("req-body").value.trim();
  if (!body) return;

  if (WEBHOOK_URL === "PLACEHOLDER_WEBHOOK_URL") {
    showResult("送信先が未設定です（webhook URLを設定してください）", true);
    return;
  }

  // Discordのcontent上限は2000字
  const content = ("📝 **改善要望**" + (name ? "（" + name + "）" : "") + "\n" + body).slice(0, 2000);

  sendBtn.disabled = true;
  showResult("送信中...", false);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    showResult("送信しました。ありがとうございます！", false);
    form.reset();
  } catch (err) {
    showResult("送信に失敗しました。通信環境を確認してもう一度お試しください。", true);
    console.error(err);
  } finally {
    sendBtn.disabled = false;
  }
});

function showResult(msg, isError) {
  result.textContent = msg;
  result.className = isError ? "result-error" : "result-ok";
}
