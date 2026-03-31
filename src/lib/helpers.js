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

export function normalizePhoneNumber(rawPhone) {
  const value = String(rawPhone || "").trim();
  if (!value) {
    return "";
  }

  const compact = value.replace(/[\s()-]/g, "");

  if (compact.startsWith("00")) {
    return `+${compact.slice(2)}`;
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  return `+${compact.replace(/\D/g, "")}`;
}

export function isMobileRecipient(value) {
  return /^\+\d{8,15}$/.test(String(value || "").trim());
}
