import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { events } from "@/db/schema";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  eventType: z.enum(["in_person", "virtual"]),
  timezone: z.string().optional(),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(15).max(480),
  organizerName: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = createEventSchema.parse(body);

    if (data.eventType === "in_person" && !data.timezone) {
      return NextResponse.json(
        { error: "Timezone is required for in-person events" },
        { status: 400 }
      );
    }

    if (data.dateRangeStart > data.dateRangeEnd) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const id = nanoid(12);
    const adminKey = nanoid(24);

    await db.insert(events).values({
      id,
      adminKey,
      title: data.title,
      description: data.description || null,
      eventType: data.eventType,
      timezone: data.timezone || null,
      dateRangeStart: data.dateRangeStart,
      dateRangeEnd: data.dateRangeEnd,
      durationMinutes: data.durationMinutes,
      organizerName: data.organizerName,
    });

    return NextResponse.json({
      eventId: id,
      adminKey,
      shareLink: `/respond/${id}`,
      dashboardLink: `/event/${id}/dashboard?key=${adminKey}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
