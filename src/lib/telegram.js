export async function sendTelegramMessage(botToken, chatId, message) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorMessage =
      data?.description || "Telegram API rejected this request";
    throw new Error(errorMessage);
  }

  return data;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
