"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { parseChatIds } from "@/lib/helpers";

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
  const [botToken, setBotToken] = useState("");
  const [message, setMessage] = useState("");
  const [chatIdsInput, setChatIdsInput] = useState("");
  const [delayMs, setDelayMs] = useState(700);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const parsedChatIds = useMemo(() => parseChatIds(chatIdsInput), [chatIdsInput]);

  const loadCampaigns = useCallback(async () => {
    const response = await fetch("/api/campaigns", { method: "GET" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setCampaigns(data.campaigns || []);
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function onFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const merged = [chatIdsInput, text].filter(Boolean).join("\n");
    setChatIdsInput(merged);
  }

  async function handleSend(event) {
    event.preventDefault();
    setError("");
    setLogs([]);

    if (!botToken.trim() || !message.trim() || parsedChatIds.length === 0) {
      setError("Bot token, message, and at least one chat ID are required.");
      return;
    }

    setIsSending(true);
    setProgress({ processed: 0, total: parsedChatIds.length });

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          message,
          chatIds: parsedChatIds,
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f9ff_0%,#fffdf8_70%)] p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-5">
          <p className="font-heading text-2xl font-semibold tracking-tight">TeleBlaster</p>
          <p className="mt-2 text-sm text-slate-600">Bulk Telegram campaign center</p>
          <div className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Logged in as</p>
            <p className="mt-1 font-semibold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>
          <button className="btn btn-ghost mt-5 w-full" onClick={() => signOut({ callbackUrl: "/login" })} type="button">
            Logout
          </button>
        </aside>

        <main className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">Send New Campaign</h1>
              <p className="badge">Recipients: {parsedChatIds.length}</p>
            </div>

            <form className="mt-5 grid gap-4" onSubmit={handleSend}>
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
                <label className="mb-1 block text-sm font-medium">Message Text</label>
                <textarea
                  className="input min-h-28"
                  placeholder="Write your campaign message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <label className="mb-1 block text-sm font-medium">Chat IDs (comma or line separated)</label>
                  <textarea
                    className="input min-h-36"
                    placeholder="123456789\n987654321"
                    value={chatIdsInput}
                    onChange={(event) => setChatIdsInput(event.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Upload IDs File</label>
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
                {isSending ? `Sending ${progress.processed}/${progress.total}` : "Send Bulk Message"}
              </button>

              {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            </form>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold tracking-tight">Delivery Logs</h2>
              <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-white">
                {logs.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No logs yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {logs.map((log, index) => (
                      <li className="p-3 text-sm" key={`${log.chatId}-${index}`}>
                        <p className="font-semibold text-slate-700">{log.chatId}</p>
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
              <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-white">
                {campaigns.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No campaigns yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {campaigns.map((campaign) => (
                      <li className="p-3 text-sm" key={campaign._id}>
                        <p className="line-clamp-2 font-medium text-slate-800">{campaign.message}</p>
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
        </main>
      </div>
    </div>
  );
}
