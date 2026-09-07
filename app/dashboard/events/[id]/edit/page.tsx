"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const statuses = [
  "DRAFT",
  "PLANNING",
  "PRE_PRODUCTION",
  "READY",
  "LIVE",
  "COMPLETED",
  "ARCHIVED",
  "ON_HOLD",
  "CANCELLED",
] as const;

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  );

  return localDate.toISOString().slice(0, 16);
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] =
    useState<(typeof statuses)[number]>("DRAFT");

  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(
          `/api/events/${params.id}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load event.",
          );
        }

        const event = data.event;

        setName(event.name);
        setDescription(event.description || "");
        setStartDate(toDateTimeLocal(event.startDate));
        setEndDate(toDateTimeLocal(event.endDate));
        setStatus(event.status);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load event.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [params.id]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            startDate: new Date(
              startDate,
            ).toISOString(),
            endDate: new Date(
              endDate,
            ).toISOString(),
            status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update event.",
        );
      }

      router.push(
        `/dashboard/events/${params.id}`,
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update event.",
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          Loading event...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Event
        </h1>

        <p className="mt-1 text-muted-foreground">
          Update event information and production status.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Event Name
              </label>

              <input
                id="name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="startDate"
                  className="text-sm font-medium"
                >
                  Start
                </label>

                <input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="endDate"
                  className="text-sm font-medium"
                >
                  End
                </label>

                <input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="status"
                className="text-sm font-medium"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as (typeof statuses)[number],
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/dashboard/events/${params.id}`,
                  )
                }
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
