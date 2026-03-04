"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation?: {
    toolName?: string;
  };
}

interface TextPart {
  type: "text";
  text: string;
}

function isToolInvocationPart(part: unknown): part is ToolInvocationPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "tool-invocation"
  );
}

function isTextPart(part: unknown): part is TextPart {
  return (
    typeof part === "object" && part !== null && "type" in part && part.type === "text"
  );
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function RespondPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [chatComplete, setChatComplete] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setEventId(p.id));
  }, [params]);

  // Load event data
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then(setEvent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        data: { participantId, eventId },
      },
    }),
    onFinish: ({ message }) => {
      // Check if the conversation has extraction tool call
      if (
        message.parts?.some(
          (part) =>
            isToolInvocationPart(part) &&
            part.toolInvocation?.toolName === "extract_availability"
        )
      ) {
        setChatComplete(true);
      }
    },
  });

  function resetResponseFlow() {
    setParticipantId(null);
    setParticipantName("");
    setChatInput("");
    setChatComplete(false);
    setMessages([]);
  }

  const isBusy = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!participantName.trim() || !eventId) return;

    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, name: participantName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to join");
      const data = await res.json();
      setParticipantId(data.participantId);
    } catch {
      setError("Failed to join event. Please try again.");
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || isBusy) return;
    sendMessage({ text: chatInput.trim() });
    setChatInput("");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error || "Event not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completion screen
  if (chatComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center text-lg">
              Thanks, {participantName}!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-gray-600 text-sm">
              Your availability has been recorded. The organizer will share the
              final time once everyone has responded.
            </p>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500">Event</p>
              <p className="font-medium">{event.title}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full text-gray-500 text-sm"
              onClick={() => {
                window.close();
                setTimeout(() => {
                  window.location.href = "/create";
                }, 150);
              }}
            >
              Close this page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Name entry screen
  if (!participantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            {event.description && (
              <p className="text-sm text-gray-500">{event.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDateForDisplay(event.dateRangeStart)} –{" "}
              {formatDateForDisplay(event.dateRangeEnd)}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-3">
              <Input
                placeholder="Your name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                autoFocus
                required
              />
              <Button type="submit" className="w-full">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chat interface (mobile-first)
  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shrink-0 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{event.title}</p>
          <p className="text-xs text-gray-400">
            {formatDateForDisplay(event.dateRangeStart)} –{" "}
            {formatDateForDisplay(event.dateRangeEnd)}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Leave without finishing? Your responses won't be saved.")) {
              resetResponseFlow();
            }
          }}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          aria-label="Leave chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => {
          // Extract text content from parts
          const textContent = message.parts
            ?.filter((part) => isTextPart(part))
            .map((part) => part.text)
            .join("");

          if (!textContent) return null;

          return (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border"
                }`}
              >
                {textContent}
              </div>
            </div>
          );
        })}

        {isBusy && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-4 py-2.5 text-sm text-gray-400">
              Typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isBusy}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" disabled={isBusy || !chatInput.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
