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
