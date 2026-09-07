"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const departmentTypes = [
  "AUDIO",
  "LIGHTING",
  "VIDEO",
  "STAGE",
  "POWER",
  "RIGGING",
  "STREAMING",
  "SPECIAL_EFFECTS",
  "SECURITY",
  "TRANSPORT",
  "OTHER",
] as const;

export default function EditDepartmentPage() {
  const params = useParams<{
    id: string;
    departmentId: string;
  }>();

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [type, setType] =
    useState<(typeof departmentTypes)[number]>("AUDIO");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadDepartment() {
      try {
        const response = await fetch(
          `/api/events/${params.id}/departments/${params.departmentId}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load department.",
          );
        }

        setName(data.department.name);
        setType(data.department.type);
        setNotes(data.department.notes || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load department.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDepartment();
  }, [params.id, params.departmentId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${params.id}/departments/${params.departmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            type,
            notes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update department.",
        );
      }

      router.push(
        `/dashboard/events/${params.id}/departments`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update department.",
      );

      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this department? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${params.id}/departments/${params.departmentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete department.",
        );
      }

      router.push(
        `/dashboard/events/${params.id}/departments`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete department.",
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          Loading department...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Department
        </h1>

        <p className="mt-1 text-muted-foreground">
          Update department information.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>
            Department Information
          </CardTitle>
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
                Department Name
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
                htmlFor="type"
                className="text-sm font-medium"
              >
                Department Type
              </label>

              <select
                id="type"
                value={type}
                onChange={(event) =>
                  setType(
                    event.target
                      .value as (typeof departmentTypes)[number],
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {departmentTypes.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium"
              >
                Notes
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Department"}
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/dashboard/events/${params.id}/departments`,
                    )
                  }
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving || deleting}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
