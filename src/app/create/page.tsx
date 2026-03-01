"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "Half day" },
  { value: "480", label: "Full day" },
];

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

type FormState =
  | { step: "form" }
  | { step: "submitting" }
  | {
      step: "success";
      shareLink: string;
      dashboardLink: string;
      eventId: string;
    };

export default function CreateEventPage() {
  const [formState, setFormState] = useState<FormState>({ step: "form" });
  const [eventType, setEventType] = useState<"in_person" | "virtual">(
    "in_person"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFormState({ step: "submitting" });

    const formData = new FormData(e.currentTarget);

    const body = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      eventType,
      timezone:
        eventType === "in_person"
          ? (formData.get("timezone") as string)
          : undefined,
      dateRangeStart: formData.get("dateRangeStart") as string,
      dateRangeEnd: formData.get("dateRangeEnd") as string,
      durationMinutes: parseInt(formData.get("durationMinutes") as string, 10),
      organizerName: formData.get("organizerName") as string,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }

      const data = await res.json();
      setFormState({
        step: "success",
        shareLink: data.shareLink,
        dashboardLink: data.dashboardLink,
        eventId: data.eventId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setFormState({ step: "form" });
    }
  }

  if (formState.step === "success") {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Event Created!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Share this link with participants
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  readOnly
                  value={`${baseUrl}${formState.shareLink}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${baseUrl}${formState.shareLink}`
                    )
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">
                Your admin dashboard
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep this link private — it&apos;s your admin access
              </p>
              <div className="mt-1 flex gap-2">
                <Input
                  readOnly
                  value={`${baseUrl}${formState.dashboardLink}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${baseUrl}${formState.dashboardLink}`
                    )
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <Button className="w-full" asChild>
              <a href={formState.dashboardLink}>Go to Dashboard</a>
            </Button>

            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => setFormState({ step: "form" })}
            >
              Create another event
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create an Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="organizerName">Your name</Label>
              <Input
                id="organizerName"
                name="organizerName"
                required
                placeholder="Alex"
              />
            </div>

            <div>
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Team dinner, Book club meeting..."
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Any details participants should know..."
                rows={2}
              />
            </div>

            <div>
              <Label>Event type</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={eventType === "in_person" ? "default" : "outline"}
                  onClick={() => setEventType("in_person")}
                  className="flex-1"
                >
                  In Person
                </Button>
                <Button
                  type="button"
                  variant={eventType === "virtual" ? "default" : "outline"}
                  onClick={() => setEventType("virtual")}
                  className="flex-1"
                >
                  Virtual
                </Button>
              </div>
            </div>

            {eventType === "in_person" && (
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select name="timezone" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dateRangeStart">Earliest date</Label>
                <Input
                  id="dateRangeStart"
                  name="dateRangeStart"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label htmlFor="dateRangeEnd">Latest date</Label>
                <Input
                  id="dateRangeEnd"
                  name="dateRangeEnd"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="durationMinutes">Expected duration</Label>
              <Select name="durationMinutes" defaultValue="60">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={formState.step === "submitting"}
            >
              {formState.step === "submitting"
                ? "Creating..."
                : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
