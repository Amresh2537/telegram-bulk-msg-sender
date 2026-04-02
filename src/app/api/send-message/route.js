import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import { parseRecipients } from "@/lib/helpers";
import { delay, sendTelegramMessage } from "@/lib/telegram";

const MIN_RATE_DELAY_MS = 300;
const MAX_RATE_DELAY_MS = 5000;

function sse(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const botToken = body?.botToken?.trim();
  const message = String(body?.message || "").trim();
  const contentType = ["text", "photo", "video", "document"].includes(body?.contentType)
    ? body.contentType
    : "text";
  const mediaUrl = String(body?.mediaUrl || "").trim();
  const parseMode = body?.parseMode === "MarkdownV2" ? "MarkdownV2" : "HTML";
  const disableLinkPreview = Boolean(body?.disableLinkPreview);
  const recipients = parseRecipients(body?.recipients ?? body?.chatIds);
  const requestedDelay = Number(body?.delayMs) || 700;
  const delayMs = Math.min(Math.max(requestedDelay, MIN_RATE_DELAY_MS), MAX_RATE_DELAY_MS);

  if (!botToken || recipients.length === 0) {
    return Response.json(
      { error: "botToken and recipients are required." },
      { status: 400 }
    );
  }

  if (contentType === "text" && !message) {
    return Response.json(
      { error: "message is required for text campaigns." },
      { status: 400 }
    );
  }

  if (contentType !== "text" && !mediaUrl) {
    return Response.json(
      { error: "mediaUrl is required for photo, video, and document campaigns." },
      { status: 400 }
    );
  }

  await connectDB();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let successCount = 0;
      let failedCount = 0;
      const results = [];

      try {
        for (let index = 0; index < recipients.length; index += 1) {
          const recipient = recipients[index];
          const chatId = recipient;

          try {
            await sendTelegramMessage(
              botToken,
              chatId,
              {
                contentType,
                text: message,
                mediaUrl,
              },
              {
                parseMode,
                disableLinkPreview,
              }
            );
            successCount += 1;
            results.push({ recipient, chatId, success: true, error: null });
          } catch (error) {
            failedCount += 1;
            results.push({
              recipient,
              chatId,
              success: false,
              error: error.message || "Failed to send message",
            });
          }

          const progressEvent = {
            type: "progress",
            processed: index + 1,
            total: recipients.length,
            successCount,
            failedCount,
            current: results.at(-1),
          };
          controller.enqueue(encoder.encode(sse(progressEvent)));

          if (index < recipients.length - 1) {
            await delay(delayMs);
          }
        }

        await Campaign.create({
          userId: session.user.id,
          message,
          contentType,
          mediaUrl,
          parseMode,
          disableLinkPreview,
          totalUsers: recipients.length,
          successCount,
          failedCount,
          timestamp: new Date(),
        });

        const completeEvent = {
          type: "complete",
          successCount,
          failedCount,
          total: recipients.length,
          results,
        };

        controller.enqueue(encoder.encode(sse(completeEvent)));
        controller.close();
      } catch (error) {
        const errorEvent = {
          type: "error",
          message: error.message || "Unexpected server error",
        };
        controller.enqueue(encoder.encode(sse(errorEvent)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
