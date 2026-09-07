"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Category = {
  id: number;
  name: string;
  code: string;
  description: string | null;
};

export default function EditEquipmentCategoryPage() {
  const params = useParams();
  const router = useRouter();

  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategory() {
      try {
        const response = await fetch(
          `/api/equipment/categories/${categoryId}`,
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load category.");
          return;
        }

        setCategory(data.category);
        setName(data.category.name);
        setCode(data.category.code);
        setDescription(data.category.description || "");
      } catch {
        setError("Failed to load category.");
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
  }, [categoryId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      const response = await fetch(
        `/api/equipment/categories/${categoryId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update category.");
        return;
      }

      router.push("/dashboard/equipment/categories");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this equipment category?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleting(true);

    try {
      const response = await fetch(
        `/api/equipment/categories/${categoryId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete category.");
        return;
      }

      router.push("/dashboard/equipment/categories");
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
          Loading category...
        </p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Category Not Found</h1>

        <p className="text-sm text-muted-foreground">
          {error || "The requested category could not be found."}
        </p>

        <Link href="/dashboard/equipment/categories">
          <Button variant="outline">
            Back to Categories
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Edit Equipment Category
        </h1>

        <p className="text-sm text-muted-foreground">
          Update the category information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Category Name
              </label>

              <input
                id="name"
                type="text"
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
                htmlFor="code"
                className="text-sm font-medium"
              >
                Category Code
              </label>

              <input
                id="code"
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? "Deleting..." : "Delete Category"}
              </Button>

              <div className="flex items-center gap-3">
                <Link href="/dashboard/equipment/categories">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>

                <Button type="submit" disabled={saving || deleting}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
