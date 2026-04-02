export function parseChatIds(rawChatIds) {
  if (Array.isArray(rawChatIds)) {
    return rawChatIds
      .map((id) => String(id).trim())
      .filter(Boolean);
  }

  if (typeof rawChatIds === "string") {
    return rawChatIds
      .split(/[\n,]/)
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
}

export function parseRecipients(rawRecipients) {
  if (Array.isArray(rawRecipients)) {
    return rawRecipients
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof rawRecipients === "string") {
    return rawRecipients
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}
