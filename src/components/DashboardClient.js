"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { parseRecipients } from "@/lib/helpers";

function parseSseChunk(rawChunk) {
  return rawChunk
    .split("\n\n")
    .map((event) => event.trim())
    .filter(Boolean)
    .map((event) => {
      const line = event
        .split("\n")
        .find((entry) => entry.startsWith("data:"));

      if (!line) {
        return null;
      }

      const payload = line.replace("data:", "").trim();
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export default function DashboardClient({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [botToken, setBotToken] = useState("");
  const [message, setMessage] = useState("");
  const [contentType, setContentType] = useState("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [parseMode, setParseMode] = useState("HTML");
  const [disableLinkPreview, setDisableLinkPreview] = useState(false);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [delayMs, setDelayMs] = useState(700);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sendSummary, setSendSummary] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactForm, setContactForm] = useState({ name: "", chatId: "" });
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  const templates = useMemo(
    () => [
      "Hello! This is your update from our team.",
      "Special offer is live now. Reply here for details.",
      "Reminder: your scheduled event starts in 1 hour.",
    ],
    []
  );

  const parsedRecipients = useMemo(
    () => parseRecipients(recipientsInput),
    [recipientsInput]
  );

  const savedRecipientIds = useMemo(
    () => contacts.map((contact) => String(contact.chatId || "").trim()).filter(Boolean),
    [contacts]
  );

  const campaignStats = useMemo(() => {
    const totalSent = campaigns.reduce((sum, item) => sum + (item.totalUsers || 0), 0);
    const totalSuccess = campaigns.reduce((sum, item) => sum + (item.successCount || 0), 0);
    const successRate = totalSent === 0 ? 0 : Math.round((totalSuccess / totalSent) * 100);

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      successRate,
    };
  }, [campaigns]);

  const loadCampaigns = useCallback(async () => {
    const response = await fetch("/api/campaigns", { method: "GET" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setCampaigns(data.campaigns || []);
  }, []);

  const loadContacts = useCallback(async () => {
    const response = await fetch("/api/contacts", { method: "GET" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setContacts(data.contacts || []);
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadContacts();
  }, [loadCampaigns, loadContacts]);

  async function onFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const merged = [recipientsInput, text].filter(Boolean).join("\n");
    setRecipientsInput(merged);
  }

  async function handleSend(event) {
    event.preventDefault();
    setError("");
    setSendSummary(null);
    setLogs([]);

    if (!botToken.trim() || parsedRecipients.length === 0) {
      setError("Bot token and at least one recipient are required.");
      return;
    }

    if (contentType === "text" && !message.trim()) {
      setError("Message text is required for text campaigns.");
      return;
    }

    if (contentType !== "text" && !mediaUrl.trim()) {
      setError("Media URL is required for photo, video, and document campaigns.");
      return;
    }

    setIsSending(true);
    setProgress({ processed: 0, total: parsedRecipients.length });

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          message,
          contentType,
          mediaUrl,
          parseMode,
          disableLinkPreview,
          recipients: parsedRecipients,
          delayMs,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        const events = parseSseChunk(chunks.join("\n\n"));

        events.forEach((eventPayload) => {
          if (eventPayload.type === "progress") {
            setProgress({
              processed: eventPayload.processed,
              total: eventPayload.total,
            });
            if (eventPayload.current) {
              setLogs((prev) => [eventPayload.current, ...prev].slice(0, 150));
            }
          }

          if (eventPayload.type === "complete") {
            setProgress({
              processed: eventPayload.total,
              total: eventPayload.total,
            });

            setSendSummary({
              successCount: eventPayload.successCount || 0,
              failedCount: eventPayload.failedCount || 0,
              total: eventPayload.total || 0,
            });

            if ((eventPayload.failedCount || 0) > 0 && (eventPayload.successCount || 0) === 0) {
              const firstFailed = (eventPayload.results || []).find((item) => !item.success);
              setError(firstFailed?.error || "All messages failed.");
            }
          }

          if (eventPayload.type === "error") {
            throw new Error(eventPayload.message || "Server error");
          }
        });
      }

      await loadCampaigns();
    } catch (sendError) {
      setError(sendError.message || "Failed to send messages");
    } finally {
      setIsSending(false);
    }
  }

  async function handleAddContact(event) {
    event.preventDefault();
    setContactError("");
    setContactSuccess("");

    if (!contactForm.chatId.trim()) {
      setContactError("Telegram ID is required.");
      return;
    }

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          chatId: contactForm.chatId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save contact");
      }

      setContacts(data.contacts || []);
      setContactForm({ name: "", chatId: "" });
      setContactSuccess("Contact saved with Telegram ID.");
    } catch (saveError) {
      setContactError(saveError.message || "Failed to save contact");
    }
  }

  async function handleDeleteContact(contactId) {
    setContactError("");
    setContactSuccess("");

    try {
      const response = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete contact");
      }

      setContacts(data.contacts || []);
    } catch (deleteError) {
      setContactError(deleteError.message || "Failed to delete contact");
    }
  }

  function jumpTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false);
  }

  function loadSavedRecipients() {
    if (savedRecipientIds.length === 0) {
      setError("No saved Telegram IDs found in Contacts.");
      return;
    }

    setError("");
    setRecipientsInput(savedRecipientIds.join("\n"));
  }

  function clearRecipients() {
    setRecipientsInput("");
  }

  return (
    <div className="dashboard-bg min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl gap-5">
        {sidebarOpen ? (
          <button
            className="fixed inset-0 z-30 bg-slate-900/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
            aria-label="Close menu"
          />
        ) : null}

        <aside className={`dashboard-aside card z-40 p-5 ${sidebarOpen ? "is-open" : ""}`}>
          <p className="font-heading text-2xl font-semibold tracking-tight">TeleBlaster Pro</p>
          <p className="mt-2 text-sm text-slate-600">Campaign cockpit for Telegram outreach</p>

          <button
            className="btn btn-ghost mt-5 flex w-full items-center justify-center gap-2 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            Close Menu
          </button>

          <nav className="mt-5 grid gap-2">
            <button className="btn btn-ghost justify-start" onClick={() => jumpTo("overview")} type="button">
              Overview
            </button>
            <button className="btn btn-ghost justify-start" onClick={() => jumpTo("compose")} type="button">
              Send Campaign
            </button>
            <button className="btn btn-ghost justify-start" onClick={() => jumpTo("activity")} type="button">
              Activity
            </button>
            <button className="btn btn-ghost justify-start" onClick={() => jumpTo("contacts")} type="button">
              Contacts
            </button>
          </nav>

          <div className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Logged in as</p>
            <p className="mt-1 font-semibold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>

          <button
            className="btn btn-ghost mt-5 w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
            type="button"
          >
            Logout
          </button>
        </aside>

        <main className="flex-1 space-y-5">
          <header className="card flex items-center justify-between p-4 sm:px-6">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-slate-600">Manage sends by Telegram ID</p>
            </div>
            <button
              className="btn btn-ghost inline-flex h-11 w-11 flex-col items-center justify-center p-0 lg:hidden"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
              <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
            </button>
          </header>

          <section id="overview" className="grid gap-4 sm:grid-cols-3">
            <article className="card p-5">
              <p className="text-sm text-slate-600">Total Campaigns</p>
              <p className="mt-2 font-heading text-3xl font-semibold">{campaignStats.totalCampaigns}</p>
            </article>
            <article className="card p-5">
              <p className="text-sm text-slate-600">Messages Attempted</p>
              <p className="mt-2 font-heading text-3xl font-semibold">{campaignStats.totalSent}</p>
            </article>
            <article className="card p-5">
              <p className="text-sm text-slate-600">Overall Success Rate</p>
              <p className="mt-2 font-heading text-3xl font-semibold">{campaignStats.successRate}%</p>
            </article>
          </section>

          <section id="compose" className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">Send New Campaign</h2>
              <p className="badge">Recipients: {parsedRecipients.length}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  className="badge cursor-pointer"
                  key={template}
                  onClick={() => setMessage(template)}
                  type="button"
                >
                  Use Template
                </button>
              ))}
            </div>

            <form className="mt-5 grid gap-4" onSubmit={handleSend}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Content Type</label>
                  <select
                    className="input"
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="photo">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Format Mode</label>
                  <select
                    className="input"
                    value={parseMode}
                    onChange={(event) => setParseMode(event.target.value)}
                  >
                    <option value="HTML">HTML</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Message Options</label>
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={disableLinkPreview}
                      onChange={(event) => setDisableLinkPreview(event.target.checked)}
                    />
                    Disable link preview in text messages
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Telegram Bot Token</label>
                <input
                  className="input"
                  placeholder="123456789:AA..."
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {contentType === "text" ? "Message Text" : "Caption (optional)"}
                </label>
                <textarea
                  className="input min-h-28"
                  placeholder={contentType === "text" ? "Write your campaign message" : "Optional media caption"}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required={contentType === "text"}
                />
                <p className="mt-1 text-xs text-slate-500">{message.length}/4096 characters</p>
              </div>

              {contentType !== "text" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Media URL or Telegram file_id</label>
                  <input
                    className="input"
                    placeholder={
                      contentType === "photo"
                        ? "https://.../image.jpg or AgAC..."
                        : contentType === "video"
                          ? "https://.../video.mp4 or BAAC..."
                          : "https://.../file.pdf or BQAC..."
                    }
                    value={mediaUrl}
                    onChange={(event) => setMediaUrl(event.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Telegram accepts public URLs or existing file_id values for media sends.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div>
                  <label className="mb-1 block text-sm font-medium">Recipients (Telegram IDs)</label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button className="btn btn-ghost" type="button" onClick={loadSavedRecipients}>
                      Use Saved IDs ({savedRecipientIds.length})
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={clearRecipients}>
                      Clear Recipients
                    </button>
                  </div>
                  <textarea
                    className="input min-h-36"
                    placeholder={"123456789\n-1001234567890"}
                    value={recipientsInput}
                    onChange={(event) => setRecipientsInput(event.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Enter one Telegram chat ID per line or comma.</p>
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Upload Recipient File</label>
                    <input className="input cursor-pointer" type="file" accept=".txt,.csv" onChange={onFileUpload} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Delay (ms)</label>
                    <input
                      className="input"
                      type="number"
                      min={300}
                      max={5000}
                      value={delayMs}
                      onChange={(event) => setDelayMs(Number(event.target.value) || 700)}
                    />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary w-full sm:w-fit" disabled={isSending} type="submit">
                {isSending ? `Sending ${progress.processed}/${progress.total}` : "Launch Campaign"}
              </button>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0072db,#00a6a6)] transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${Math.min((progress.processed / progress.total) * 100, 100)}%`
                        : "0%",
                  }}
                />
              </div>

              {sendSummary ? (
                <p
                  className={
                    sendSummary.failedCount > 0
                      ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                      : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                  }
                >
                  Sent: {sendSummary.successCount} of {sendSummary.total}. Failed: {sendSummary.failedCount}.
                </p>
              ) : null}

              <div className="grid gap-2 rounded-xl border border-[var(--line)] bg-white p-3 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-slate-800">Mode:</span> {contentType}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Formatting:</span> {parseMode}
                </p>
              </div>

              {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

              <p className="text-xs text-slate-500">
                The bot can only message chats it already has access to. For private users, they must start the bot first.
              </p>
            </form>
          </section>

          <section id="activity" className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold tracking-tight">Delivery Logs</h2>
              <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[var(--line)] bg-white">
                {logs.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No logs yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {logs.map((log, index) => (
                      <li className="p-3 text-sm" key={`${log.recipient || log.chatId}-${index}`}>
                        <p className="font-semibold text-slate-700">{log.recipient || log.chatId}</p>
                        {log.chatId ? (
                          <p className="text-xs text-slate-500">Target chat ID: {log.chatId}</p>
                        ) : null}
                        <p className={log.success ? "text-emerald-600" : "text-red-600"}>
                          {log.success ? "Delivered" : `Failed: ${log.error}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold tracking-tight">Campaign History</h2>
              <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[var(--line)] bg-white">
                {campaigns.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No campaigns yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {campaigns.map((campaign) => (
                      <li className="p-3 text-sm" key={campaign._id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="badge">{campaign.contentType || "text"}</p>
                          {campaign.mediaUrl ? <p className="badge">media</p> : null}
                          <p className="badge">{campaign.parseMode || "HTML"}</p>
                        </div>
                        <p className="mt-2 line-clamp-2 font-medium text-slate-800">
                          {campaign.message || "Media campaign without caption"}
                        </p>
                        {campaign.mediaUrl ? (
                          <p className="line-clamp-1 text-xs text-slate-500">{campaign.mediaUrl}</p>
                        ) : null}
                        <p className="mt-1 text-slate-600">Total: {campaign.totalUsers}</p>
                        <p className="text-emerald-600">Success: {campaign.successCount}</p>
                        <p className="text-red-600">Failed: {campaign.failedCount}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(campaign.timestamp).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section id="contacts" className="card p-5 sm:p-6">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Saved Telegram IDs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Save Telegram IDs here so you have a reusable list of contacts.
            </p>

            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleAddContact}>
              <input
                className="input"
                placeholder="Name (optional)"
                value={contactForm.name}
                onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="input"
                placeholder="123456789 or -100..."
                value={contactForm.chatId}
                onChange={(event) => setContactForm((prev) => ({ ...prev, chatId: event.target.value }))}
                required
              />
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </form>

            {contactError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{contactError}</p>
            ) : null}
            {contactSuccess ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {contactSuccess}
              </p>
            ) : null}

            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[var(--line)] bg-white">
              {contacts.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No saved Telegram IDs yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {contacts.map((contact) => (
                    <li className="flex items-center justify-between gap-3 p-3 text-sm" key={contact._id}>
                      <div>
                        <p className="font-semibold text-slate-800">{contact.name || "Unnamed"}</p>
                        <p className="text-slate-600">Telegram ID: {contact.chatId}</p>
                      </div>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => handleDeleteContact(contact._id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
