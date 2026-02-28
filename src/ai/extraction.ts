import { z } from "zod";

export const availabilitySchema = z.object({
  windows: z.array(
    z.object({
      date: z.string().describe("ISO date string, e.g., 2026-03-15"),
      startTime: z
        .string()
        .nullable()
        .describe("Start time in HH:mm 24h format. Null if entire day."),
      endTime: z
        .string()
        .nullable()
        .describe("End time in HH:mm 24h format. Null if entire day."),
      preference: z.enum(["preferred", "available", "if_needed", "unavailable"]),
      note: z
        .string()
        .nullable()
        .describe(
          'Any conditional or contextual note, e.g., "only if virtual", "have to leave by 4pm"'
        ),
    })
  ),
  participantTimezone: z
    .string()
    .nullable()
    .describe(
      "IANA timezone if the participant stated one (e.g., America/New_York), null otherwise"
    ),
  summary: z
    .string()
    .describe(
      "One-sentence natural language summary of this participant's overall availability pattern"
    ),
});

export type AvailabilityData = z.infer<typeof availabilitySchema>;
