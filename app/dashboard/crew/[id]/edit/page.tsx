"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CrewMember = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  crewType: string;
  status: string;
  skills: string | null;
  notes: string | null;
};

export default function EditCrewMemberPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCrewMember() {
      try {
        const response = await fetch(`/api/crew/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Unable to load crew member.");
          return;
        }

        const crew = data.crewMember as CrewMember;

        setForm({
          name: crew.name ?? "",
          email: crew.email ?? "",
          phone: crew.phone ?? "",
          designation: crew.designation ?? "",
          crewType: crew.crewType ?? "FREELANCER",
          status: crew.status ?? "ACTIVE",
          skills: crew.skills ?? "",
          notes: crew.notes ?? "",
        });
      } catch {
        setError("Unable to load crew member.");
      } finally {
        setLoading(false);
      }
    }

    loadCrewMember();
  }, [id]);

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
      const response = await fetch(`/api/crew/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to update crew member.");
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

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this crew member?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      const response = await fetch(`/api/crew/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to delete crew member.");
        return;
      }

      router.push("/dashboard/crew");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted-foreground">
          Loading crew member...
        </p>
      </div>
    );
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
          Edit Crew Member
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Update crew member information.
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
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="inline-flex h-9 items-center justify-center rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>

              <div className="flex gap-3">
                <Link
                  href="/dashboard/crew"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
