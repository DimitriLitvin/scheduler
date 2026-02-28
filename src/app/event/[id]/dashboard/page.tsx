"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AvailabilityWindow {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  preference: "preferred" | "available" | "if_needed" | "unavailable";
  note: string | null;
}

interface Participant {
  id: string;
  name: string;
  chatStatus: string;
  completedAt: string | null;
  availability: AvailabilityWindow[];
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
  organizerName: string;
}

interface DashboardData {
  event: EventData;
  participants: Participant[];
  totalParticipants: number;
  completedParticipants: number;
}

interface SynthesisResult {
  recommendedDate: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
  recommendationSummary: string;
  alternativesJson: string;
  tradeoffsJson: string;
  participantImpactJson: string;
}

const PREFERENCE_COLORS = {
  preferred: "bg-green-100 text-green-800 border-green-200",
  available: "bg-blue-100 text-blue-800 border-blue-200",
  if_needed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  unavailable: "bg-red-100 text-red-800 border-red-200",
};

const PREFERENCE_LABELS = {
  preferred: "Preferred",
  available: "Available",
  if_needed: "If needed",
  unavailable: "Unavailable",
};

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "Any time";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(
    null
  );

  // Resolve params and get admin key from URL
  useEffect(() => {
    params.then((p) => {
      setEventId(p.id);
      const urlParams = new URLSearchParams(window.location.search);
      setAdminKey(urlParams.get("key"));
    });
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!eventId || !adminKey) return;
    try {
      const res = await fetch(
        `/api/responses/${eventId}?key=${adminKey}`
      );
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid admin key");
        throw new Error("Failed to load dashboard");
      }
      const dashData = await res.json();
      setData(dashData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [eventId, adminKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for existing synthesis result
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/synthesis/${eventId}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((result) => {
        if (result) setSynthesis(result);
      })
      .catch(() => {});
  }, [eventId]);

  async function handleSynthesis() {
    if (!eventId || !adminKey) return;
    setSynthesizing(true);
    try {
      const res = await fetch(`/api/synthesis/${eventId}?key=${adminKey}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Synthesis failed");
      }
      const result = await res.json();
      setSynthesis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Synthesis failed");
    } finally {
      setSynthesizing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error || "Failed to load"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareLink = `${baseUrl}/respond/${eventId}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Event header */}
        <Card>
          <CardHeader>
            <CardTitle>{data.event.title}</CardTitle>
            {data.event.description && (
              <p className="text-sm text-gray-500">{data.event.description}</p>
            )}
            <div className="flex gap-4 text-xs text-gray-400 mt-1">
              <span>
                {formatDateShort(data.event.dateRangeStart)} –{" "}
                {formatDateShort(data.event.dateRangeEnd)}
              </span>
              <span>{data.event.durationMinutes} min</span>
              <span>
                {data.event.eventType === "in_person"
                  ? `In person (${data.event.timezone})`
                  : "Virtual"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input readOnly value={shareLink} className="text-sm flex-1" />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(shareLink)}
              >
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Response count */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {data.completedParticipants} of {data.totalParticipants}
                </p>
                <p className="text-sm text-gray-500">responses received</p>
              </div>
              <Button
                onClick={handleSynthesis}
                disabled={data.completedParticipants < 2 || synthesizing}
              >
                {synthesizing
                  ? "Finding best time..."
                  : data.completedParticipants < 2
                    ? "Waiting for responses..."
                    : "Run with current responses"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Synthesis result */}
        {synthesis && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg">Recommended Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {formatDateShort(synthesis.recommendedDate)}
                </p>
                <p className="text-lg text-gray-700">
                  {formatTime(synthesis.recommendedStartTime)} –{" "}
                  {formatTime(synthesis.recommendedEndTime)}
                </p>
              </div>
              <p className="text-sm text-gray-700">
                {synthesis.recommendationSummary}
              </p>

              {synthesis.tradeoffsJson && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Tradeoffs
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(
                      JSON.parse(synthesis.tradeoffsJson) as string[]
                    ).map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-gray-400">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${baseUrl}/event/${eventId}/result`
                    )
                  }
                >
                  Copy Result Link
                </Button>
                <Button className="flex-1" asChild>
                  <a href={`/event/${eventId}/result`}>View Result Page</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            {data.participants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No one has responded yet. Share the link above!
              </p>
            ) : (
              <div className="divide-y">
                {data.participants.map((p) => (
                  <div key={p.id} className="py-3">
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() =>
                        setExpandedParticipant(
                          expandedParticipant === p.id ? null : p.id
                        )
                      }
                    >
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span
                          className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            p.chatStatus === "completed"
                              ? "bg-green-100 text-green-700"
                              : p.chatStatus === "in_progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {p.chatStatus === "completed"
                            ? "Done"
                            : p.chatStatus === "in_progress"
                              ? "Chatting"
                              : "Not started"}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {expandedParticipant === p.id ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandedParticipant === p.id &&
                      p.availability.length > 0 && (
                        <div className="mt-3 space-y-2 pl-2">
                          {p.availability.map((w) => (
                            <div
                              key={w.id}
                              className={`text-sm px-3 py-2 rounded border ${PREFERENCE_COLORS[w.preference]}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {formatDateShort(w.date)}
                                </span>
                                <span className="text-xs">
                                  {PREFERENCE_LABELS[w.preference]}
                                </span>
                              </div>
                              <div className="text-xs mt-0.5 opacity-75">
                                {w.startTime
                                  ? `${formatTime(w.startTime)} – ${formatTime(w.endTime)}`
                                  : "Any time"}
                                {w.note && ` · ${w.note}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
