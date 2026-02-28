import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { participants, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const registerSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Verify event exists
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const id = nanoid(12);

    await db.insert(participants).values({
      id,
      eventId: data.eventId,
      name: data.name,
      chatStatus: "not_started",
    });

    return NextResponse.json({ participantId: id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }
    console.error("Failed to register participant:", error);
    return NextResponse.json(
      { error: "Failed to register participant" },
      { status: 500 }
    );
  }
}
