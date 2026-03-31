import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import { parseChatIds } from "@/lib/helpers";
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
  const message = body?.message?.trim();
  const chatIds = parseChatIds(body?.chatIds);
  const requestedDelay = Number(body?.delayMs) || 700;
  const delayMs = Math.min(Math.max(requestedDelay, MIN_RATE_DELAY_MS), MAX_RATE_DELAY_MS);

  if (!botToken || !message || chatIds.length === 0) {
    return Response.json(
      { error: "botToken, message, and chatIds are required." },
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
        for (let index = 0; index < chatIds.length; index += 1) {
          const chatId = chatIds[index];

          try {
            await sendTelegramMessage(botToken, chatId, message);
            successCount += 1;
            results.push({ chatId, success: true, error: null });
          } catch (error) {
            failedCount += 1;
            results.push({
              chatId,
              success: false,
              error: error.message || "Failed to send message",
            });
          }

          const progressEvent = {
            type: "progress",
            processed: index + 1,
            total: chatIds.length,
            successCount,
            failedCount,
            current: results.at(-1),
          };
          controller.enqueue(encoder.encode(sse(progressEvent)));

          if (index < chatIds.length - 1) {
            await delay(delayMs);
          }
        }

        await Campaign.create({
          userId: session.user.id,
          message,
          totalUsers: chatIds.length,
          successCount,
          failedCount,
          timestamp: new Date(),
        });

        const completeEvent = {
          type: "complete",
          successCount,
          failedCount,
          total: chatIds.length,
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
