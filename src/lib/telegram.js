function formatTelegramError(description, status, chatId) {
  const rawMessage = String(description || "").trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("chat not found")) {
    return `Chat not found for Telegram ID ${chatId}. Verify the ID, make sure the user started the bot, or add the bot to the target group/channel.`;
  }

  if (normalizedMessage.includes("bot was blocked by the user")) {
    return `The user blocked this bot for Telegram ID ${chatId}. They need to unblock the bot before you can send messages.`;
  }

  if (normalizedMessage.includes("user is deactivated")) {
    return `The Telegram account for ID ${chatId} is deactivated.`;
  }

  if (normalizedMessage.includes("have no rights to send a message")) {
    return `The bot does not have permission to send messages to Telegram ID ${chatId}. Check the group's/channel's bot permissions.`;
  }

  return rawMessage || `Telegram API rejected this request (HTTP ${status})`;
}

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
    const errorMessage = formatTelegramError(data?.description, response.status, chatId);
    throw new Error(errorMessage);
  }

  return data;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
