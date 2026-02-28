import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  events,
  participants,
  chatMessages,
  availabilityWindows,
} from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { chatModel } from "@/ai/models";
import { buildChatSystemPrompt } from "@/ai/chat-system-prompt";
import { availabilitySchema } from "@/ai/extraction";

const MAX_USER_MESSAGES = 10;

export async function POST(request: Request) {
  const { messages, data } = await request.json();
  const { participantId, eventId } = data as {
    participantId: string;
    eventId: string;
  };

  // Fetch event + participant
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });

  if (!event || !participant) {
    return new Response("Event or participant not found", { status: 404 });
  }

  // Enforce server-side message cap
  const userMessageCount = messages.filter(
    (m: { role: string }) => m.role === "user"
  ).length;

  if (userMessageCount > MAX_USER_MESSAGES) {
    return new Response(
      JSON.stringify({
        error: "Conversation limit reached",
      }),
      { status: 429 }
    );
  }

  // Mark as in_progress on first message
  if (participant.chatStatus === "not_started") {
    await db
      .update(participants)
      .set({ chatStatus: "in_progress" })
      .where(eq(participants.id, participantId));
  }

  const systemPrompt = buildChatSystemPrompt({
    eventTitle: event.title,
    eventDescription: event.description,
    eventType: event.eventType as "in_person" | "virtual",
    timezone: event.timezone,
    dateRangeStart: event.dateRangeStart,
    dateRangeEnd: event.dateRangeEnd,
    durationMinutes: event.durationMinutes,
    participantName: participant.name,
  });

  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      extract_availability: tool({
        description:
          "Extract structured availability data from the conversation. Call this once you have confirmed the participant's availability with them.",
        inputSchema: availabilitySchema,
        execute: async (extractedData) => {
          // Write availability windows to database
          for (const window of extractedData.windows) {
            await db.insert(availabilityWindows).values({
              id: nanoid(12),
              participantId,
              date: window.date,
              startTime: window.startTime,
              endTime: window.endTime,
              preference: window.preference,
              note: window.note,
            });
          }

          // Update participant timezone if provided
          if (extractedData.participantTimezone) {
            await db
              .update(participants)
              .set({ timezone: extractedData.participantTimezone })
              .where(eq(participants.id, participantId));
          }

          // Mark participant as completed
          await db
            .update(participants)
            .set({
              chatStatus: "completed",
              completedAt: new Date().toISOString(),
            })
            .where(eq(participants.id, participantId));

          return {
            success: true,
            summary: extractedData.summary,
          };
        },
      }),
    },
    stopWhen: stepCountIs(2),
    onFinish: async ({ response }) => {
      // Persist the latest user message and assistant response
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        const msgCount = await db
          .select({ value: count() })
          .from(chatMessages)
          .where(eq(chatMessages.participantId, participantId));

        const nextIndex = msgCount[0]?.value ?? 0;

        await db.insert(chatMessages).values({
          id: nanoid(12),
          participantId,
          role: "user",
          content:
            typeof lastUserMsg.content === "string"
              ? lastUserMsg.content
              : JSON.stringify(lastUserMsg.content),
          messageIndex: nextIndex,
        });

        // Store assistant response
        for (const msg of response.messages) {
          if (msg.role === "assistant") {
            const textContent =
              typeof msg.content === "string"
                ? msg.content
                : Array.isArray(msg.content)
                  ? msg.content
                      .filter((c) => c.type === "text")
                      .map((c) => ("text" in c ? c.text : ""))
                      .join("")
                  : "";
            if (textContent) {
              await db.insert(chatMessages).values({
                id: nanoid(12),
                participantId,
                role: "assistant",
                content: textContent,
                messageIndex: nextIndex + 1,
              });
            }
          }
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
