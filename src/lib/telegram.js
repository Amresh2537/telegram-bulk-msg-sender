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

function buildTelegramRequest(botToken, chatId, content, options) {
  const safeContentType = ["text", "photo", "video", "document"].includes(content?.contentType)
    ? content.contentType
    : "text";

  const parseMode = options?.parseMode === "MarkdownV2" ? "MarkdownV2" : "HTML";
  const disableLinkPreview = Boolean(options?.disableLinkPreview);
  const text = String(content?.text || "").trim();
  const mediaUrl = String(content?.mediaUrl || "").trim();

  if (safeContentType !== "text" && !mediaUrl) {
    throw new Error("Media URL is required for photo, video, and document campaigns.");
  }

  if (safeContentType === "text" && !text) {
    throw new Error("Message text is required.");
  }

  const payload = {
    chat_id: chatId,
    parse_mode: parseMode,
  };

  if (safeContentType === "photo") {
    payload.photo = mediaUrl;
    if (text) {
      payload.caption = text;
    }
    return {
      url: `https://api.telegram.org/bot${botToken}/sendPhoto`,
      payload,
      contentType: safeContentType,
    };
  }

  if (safeContentType === "video") {
    payload.video = mediaUrl;
    if (text) {
      payload.caption = text;
    }
    return {
      url: `https://api.telegram.org/bot${botToken}/sendVideo`,
      payload,
      contentType: safeContentType,
    };
  }

  if (safeContentType === "document") {
    payload.document = mediaUrl;
    if (text) {
      payload.caption = text;
    }
    return {
      url: `https://api.telegram.org/bot${botToken}/sendDocument`,
      payload,
      contentType: safeContentType,
    };
  }

  payload.text = text;
  payload.link_preview_options = { is_disabled: disableLinkPreview };
  return {
    url: `https://api.telegram.org/bot${botToken}/sendMessage`,
    payload,
    contentType: safeContentType,
  };
}

export async function sendTelegramMessage(botToken, chatId, content, options = {}) {
  const { url, payload } = buildTelegramRequest(botToken, chatId, content, options);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
