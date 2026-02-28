interface ParticipantAvailability {
  name: string;
  timezone: string | null;
  windows: {
    date: string;
    startTime: string | null;
    endTime: string | null;
    preference: string;
    note: string | null;
  }[];
}

interface SynthesisPromptParams {
  eventTitle: string;
  eventDescription: string | null;
  eventType: string;
  timezone: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  durationMinutes: number;
  participants: ParticipantAvailability[];
}

export function buildSynthesisPrompt(params: SynthesisPromptParams): string {
  const {
    eventTitle,
    eventDescription,
    eventType,
    timezone,
    dateRangeStart,
    dateRangeEnd,
    durationMinutes,
    participants,
  } = params;

  const participantData = participants
    .map((p) => {
      const windows = p.windows
        .map((w) => {
          const timeRange =
            w.startTime && w.endTime
              ? `${w.startTime}-${w.endTime}`
              : "any time";
          const noteStr = w.note ? ` (${w.note})` : "";
          return `  - ${w.date} ${timeRange}: ${w.preference}${noteStr}`;
        })
        .join("\n");
      return `${p.name}${p.timezone ? ` (${p.timezone})` : ""}:\n${windows}`;
    })
    .join("\n\n");

  return `You are an expert scheduling analyst. Your job is to find the optimal time for "${eventTitle}" given multiple participants' availability and preferences.

EVENT DETAILS:
- Title: ${eventTitle}
- Duration: ${durationMinutes} minutes
- Date range: ${dateRangeStart} to ${dateRangeEnd}
- Type: ${eventType}${timezone ? ` (timezone: ${timezone})` : ""}
${eventDescription ? `- Description: ${eventDescription}` : ""}

PARTICIPANT AVAILABILITY:
${participantData}

PREFERENCE LEVELS (strongest to weakest):
- preferred: Participant's top choice (score: 3)
- available: Works fine, no strong feeling (score: 2)
- if_needed: Would rather not, but can make it work (score: 1)
- unavailable: Cannot attend (score: 0)

ANALYSIS INSTRUCTIONS:
1. Find time slots where ALL participants are at least "if_needed" or better.
2. Score each viable slot by summing preference weights: preferred=3, available=2, if_needed=1, unavailable=0.
3. For your TOP recommendation, choose the slot with the highest total score. In case of ties, prefer the slot where no one is "if_needed" (i.e., everyone is at least "available").
4. Identify 2-3 ALTERNATIVE options, ranked by score.
5. For EACH option (including the top pick), explain the tradeoffs: who is happy, who is compromising, and what they're giving up.
6. If there is NO time where everyone can attend, say so clearly. Then recommend the time that works for the MOST people and identify who would be excluded.

IMPORTANT:
- Be specific. "Saturday afternoon" is not specific enough — say "Saturday March 15th, 2:00-3:00pm."
- If participants are in different timezones (virtual events), show times in EACH participant's timezone in the summary.
- Never fabricate availability data. If you don't have information about a participant's preference for a specific time, don't assume.
- The overallSummary will be shown directly to participants. Write it as if you're addressing the group naturally.`;
}
