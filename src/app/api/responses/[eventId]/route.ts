import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, participants, availabilityWindows } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
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

  // Get all participants with their availability
  const allParticipants = await db.query.participants.findMany({
    where: eq(participants.eventId, eventId),
  });

  const participantsWithAvailability = await Promise.all(
    allParticipants.map(async (p) => {
      const windows = await db.query.availabilityWindows.findMany({
        where: eq(availabilityWindows.participantId, p.id),
      });
      return {
        ...p,
        availability: windows,
      };
    })
  );

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      timezone: event.timezone,
      dateRangeStart: event.dateRangeStart,
      dateRangeEnd: event.dateRangeEnd,
      durationMinutes: event.durationMinutes,
      organizerName: event.organizerName,
    },
    participants: participantsWithAvailability,
    totalParticipants: allParticipants.length,
    completedParticipants: allParticipants.filter(
      (p) => p.chatStatus === "completed"
    ).length,
  });
}
