"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SynthesisResult {
  recommendedDate: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
  recommendationSummary: string;
  alternativesJson: string | null;
  tradeoffsJson: string | null;
  participantImpactJson: string | null;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  timezone: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  durationMinutes: number;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function generateICSContent(
  event: EventData,
  result: SynthesisResult
): string {
  const date = result.recommendedDate.replace(/-/g, "");
  const startTime = result.recommendedStartTime.replace(":", "") + "00";
  const endTime = result.recommendedEndTime.replace(":", "") + "00";

  // Use timezone for in-person, UTC for virtual
  const tzid = event.timezone || "UTC";
  const dtStart = `DTSTART;TZID=${tzid}:${date}T${startTime}`;
  const dtEnd = `DTEND;TZID=${tzid}:${date}T${endTime}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scheduler//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@scheduler`,
    `SUMMARY:${event.title}`,
    dtStart,
    dtEnd,
    event.description ? `DESCRIPTION:${event.description}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function downloadICS(event: EventData, result: SynthesisResult) {
  const content = generateICSContent(event, result);
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setEventId(p.id));
  }, [params]);

  useEffect(() => {
    if (!eventId) return;

    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/synthesis/${eventId}`).then((r) => {
        if (!r.ok) throw new Error("No result yet");
        return r.json();
      }),
    ])
      .then(([eventData, synthesisData]) => {
        setEvent(eventData);
        setResult(synthesisData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading result...</p>
      </div>
    );
  }

  if (error || !event || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              {error === "No result yet"
                ? "The organizer hasn't finalized a time yet. Check back soon!"
                : error || "Result not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tradeoffs: string[] = result.tradeoffsJson
    ? JSON.parse(result.tradeoffsJson)
    : [];
  const alternatives: Array<{
    date: string;
    startTime: string;
    endTime: string;
    summary: string;
  }> = result.alternativesJson ? JSON.parse(result.alternativesJson) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Top nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back
          </button>
        </div>

        {/* Main result */}
        <Card>
          <CardHeader className="text-center">
            <p className="text-sm text-gray-500">{event.title}</p>
            <CardTitle className="text-2xl">
              {formatDateDisplay(result.recommendedDate)}
            </CardTitle>
            <p className="text-xl text-gray-700">
              {formatTime(result.recommendedStartTime)} –{" "}
              {formatTime(result.recommendedEndTime)}
            </p>
            {event.timezone && (
              <p className="text-xs text-gray-400">{event.timezone}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {result.recommendationSummary}
            </p>

            <Button
              className="w-full"
              onClick={() => downloadICS(event, result)}
            >
              Add to Calendar
            </Button>
          </CardContent>
        </Card>

        {/* Tradeoffs */}
        {tradeoffs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tradeoffs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                {tradeoffs.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-400 shrink-0">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Other Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alternatives.map((alt, i) => (
                <div
                  key={i}
                  className="text-sm bg-gray-100 rounded-lg p-3"
                >
                  <p className="font-medium">
                    {formatDateDisplay(alt.date)}
                  </p>
                  <p className="text-gray-600">
                    {formatTime(alt.startTime)} – {formatTime(alt.endTime)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{alt.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
