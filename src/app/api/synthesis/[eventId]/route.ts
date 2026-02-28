import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  events,
  participants,
  availabilityWindows,
  synthesisResults,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { synthesisModel } from "@/ai/models";
import { buildSynthesisPrompt } from "@/ai/synthesis-prompt";

const synthesisOutputSchema = z.object({
  recommendation: z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    score: z.number(),
    summary: z.string(),
  }),
  alternatives: z.array(
    z.object({
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      score: z.number(),
      summary: z.string(),
    })
  ),
  tradeoffs: z.array(z.string()),
  participantImpact: z.record(
    z.string(),
    z.object({
      status: z.string(),
      note: z.string(),
    })
  ),
  overallSummary: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  // Validate admin key
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.adminKey !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get completed participants with availability
  const allParticipants = await db.query.participants.findMany({
    where: eq(participants.eventId, eventId),
  });

  const completedParticipants = allParticipants.filter(
    (p) => p.chatStatus === "completed"
  );

  if (completedParticipants.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 completed responses for synthesis" },
      { status: 400 }
    );
  }

  // Gather availability data
  const participantsWithAvailability = await Promise.all(
    completedParticipants.map(async (p) => {
      const windows = await db.query.availabilityWindows.findMany({
        where: eq(availabilityWindows.participantId, p.id),
      });
      return {
        name: p.name,
        timezone: p.timezone,
        windows: windows.map((w) => ({
          date: w.date,
          startTime: w.startTime,
          endTime: w.endTime,
          preference: w.preference,
          note: w.note,
        })),
      };
    })
  );

  // Build prompt and call Sonnet
  const prompt = buildSynthesisPrompt({
    eventTitle: event.title,
    eventDescription: event.description,
    eventType: event.eventType,
    timezone: event.timezone,
    dateRangeStart: event.dateRangeStart,
    dateRangeEnd: event.dateRangeEnd,
    durationMinutes: event.durationMinutes,
    participants: participantsWithAvailability,
  });

  try {
    const result = await generateObject({
      model: synthesisModel,
      schema: synthesisOutputSchema,
      prompt,
    });

    const synthesisData = result.object;

    // Store synthesis result
    await db.insert(synthesisResults).values({
      id: nanoid(12),
      eventId,
      recommendedDate: synthesisData.recommendation.date,
      recommendedStartTime: synthesisData.recommendation.startTime,
      recommendedEndTime: synthesisData.recommendation.endTime,
      recommendationSummary: synthesisData.overallSummary,
      alternativesJson: JSON.stringify(synthesisData.alternatives),
      tradeoffsJson: JSON.stringify(synthesisData.tradeoffs),
      participantImpactJson: JSON.stringify(synthesisData.participantImpact),
    });

    return NextResponse.json({
      recommendedDate: synthesisData.recommendation.date,
      recommendedStartTime: synthesisData.recommendation.startTime,
      recommendedEndTime: synthesisData.recommendation.endTime,
      recommendationSummary: synthesisData.overallSummary,
      alternatives: synthesisData.alternatives,
      tradeoffs: synthesisData.tradeoffs,
      participantImpact: synthesisData.participantImpact,
      alternativesJson: JSON.stringify(synthesisData.alternatives),
      tradeoffsJson: JSON.stringify(synthesisData.tradeoffs),
      participantImpactJson: JSON.stringify(synthesisData.participantImpact),
    });
  } catch (error) {
    console.error("Synthesis failed:", error);
    return NextResponse.json(
      { error: "Synthesis failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  // Get latest synthesis result
  const result = await db.query.synthesisResults.findFirst({
    where: eq(synthesisResults.eventId, eventId),
  });

  if (!result) {
    return NextResponse.json(
      { error: "No synthesis result found" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
