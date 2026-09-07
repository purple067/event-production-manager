"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCrewMemberPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    crewType: "FREELANCER",
    status: "ACTIVE",
    skills: "",
    notes: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/crew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to create crew member.");
        return;
      }

      router.push("/dashboard/crew");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/crew"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Crew
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Add Crew Member
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Add a crew member to your production team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crew Information</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Name *
              </label>

              <input
                id="name"
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                placeholder="Ram Shrestha"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="designation"
                  className="text-sm font-medium"
                >
                  Designation
                </label>

                <input
                  id="designation"
                  value={form.designation}
                  onChange={(event) =>
                    updateField(
                      "designation",
                      event.target.value,
                    )
                  }
                  placeholder="Audio Engineer"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="crewType"
                  className="text-sm font-medium"
                >
                  Crew Type
                </label>

                <select
                  id="crewType"
                  value={form.crewType}
                  onChange={(event) =>
                    updateField(
                      "crewType",
                      event.target.value,
                    )
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="FREELANCER">Freelancer</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="ram@example.com"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                  placeholder="9800000000"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
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
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value)
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="skills"
                className="text-sm font-medium"
              >
                Skills
              </label>

              <input
                id="skills"
                value={form.skills}
                onChange={(event) =>
                  updateField("skills", event.target.value)
                }
                placeholder="FOH, Monitor Mixing, RF Coordination"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              />
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
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Additional notes about this crew member..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Link
                href="/dashboard/crew"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Crew Member"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
