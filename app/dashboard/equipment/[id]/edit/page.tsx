"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EQUIPMENT_STATUSES = [
  "AVAILABLE",
  "IN_USE",
  "RESERVED",
  "MAINTENANCE",
  "DAMAGED",
  "LOST",
  "RETIRED",
];

const EQUIPMENT_CONDITIONS = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "NON_FUNCTIONAL",
];

const EQUIPMENT_OWNERSHIPS = [
  "OWNED",
  "RENTED",
  "LEASED",
  "CLIENT_PROVIDED",
  "VENDOR_PROVIDED",
];

type Category = {
  id: number;
  name: string;
  code: string;
};

type Equipment = {
  id: number;
  name: string;
  description: string | null;
  model: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  assetNumber: string | null;
  quantity: number;
  status: string;
  condition: string;
  ownership: string;
  purchaseDate: string | null;
  purchaseCost: string | number | null;
  notes: string | null;
  categoryId: number;
};

export default function EditEquipmentPage() {
  const params = useParams();
  const router = useRouter();

  const equipmentId = String(params.id);

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [equipmentResponse, categoryResponse] = await Promise.all([
          fetch(`/api/equipment/${equipmentId}`),
          fetch("/api/equipment/categories"),
        ]);

        const equipmentData = await equipmentResponse.json();
        const categoryData = await categoryResponse.json();

        if (!equipmentResponse.ok) {
          throw new Error(
            equipmentData.error || "Failed to load equipment.",
          );
        }

        if (!categoryResponse.ok) {
          throw new Error(
            categoryData.error || "Failed to load categories.",
          );
        }

        setEquipment(equipmentData.equipment);
        setCategories(categoryData.categories);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load equipment.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [equipmentId]);

  function updateField<K extends keyof Equipment>(
    field: K,
    value: Equipment[K],
  ) {
    setEquipment((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!equipment) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: equipment.name,
          categoryId: equipment.categoryId,
          quantity: equipment.quantity,
          manufacturer: equipment.manufacturer || null,
          model: equipment.model || null,
          serialNumber: equipment.serialNumber || null,
          assetNumber: equipment.assetNumber || null,
          status: equipment.status,
          condition: equipment.condition,
          ownership: equipment.ownership,
          purchaseDate: equipment.purchaseDate || null,
          purchaseCost:
            equipment.purchaseCost === ""
              ? null
              : equipment.purchaseCost,
          description: equipment.description || null,
          notes: equipment.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update equipment.",
        );
      }

      router.push("/dashboard/equipment");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update equipment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!equipment) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${equipment.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete equipment.",
        );
      }

      router.push("/dashboard/equipment");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete equipment.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading equipment...</p>
      </main>
    );
  }

  if (!equipment) {
    return (
      <main className="p-6">
        <p className="text-red-600">
          {error || "Equipment not found."}
        </p>

        <Link href="/dashboard/equipment">
          <Button className="mt-4">
            Back to Equipment
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Edit Equipment
          </h1>
          <p className="text-sm text-muted-foreground">
            Update equipment inventory information.
          </p>
        </div>

        <Link href="/dashboard/equipment">
          <Button variant="outline">
            Back
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium"
            >
              Equipment Name
            </label>
            <input
              id="name"
              value={equipment.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <Select
              value={String(equipment.categoryId)}
              onValueChange={(value) => {
                if (value) {
                  updateField("categoryId", Number(value));
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>

              <SelectContent>
                {categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={String(category.id)}
                  >
                    {category.name} ({category.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="quantity"
              className="mb-2 block text-sm font-medium"
            >
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={equipment.quantity}
              onChange={(event) =>
                updateField(
                  "quantity",
                  Number(event.target.value),
                )
              }
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="manufacturer"
              className="mb-2 block text-sm font-medium"
            >
              Manufacturer
            </label>
            <input
              id="manufacturer"
              value={equipment.manufacturer ?? ""}
              onChange={(event) =>
                updateField("manufacturer", event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="model"
              className="mb-2 block text-sm font-medium"
            >
              Model
            </label>
            <input
              id="model"
              value={equipment.model ?? ""}
              onChange={(event) =>
                updateField("model", event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="serialNumber"
              className="mb-2 block text-sm font-medium"
            >
              Serial Number
            </label>
            <input
              id="serialNumber"
              value={equipment.serialNumber ?? ""}
              onChange={(event) =>
                updateField("serialNumber", event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="assetNumber"
              className="mb-2 block text-sm font-medium"
            >
              Asset Number
            </label>
            <input
              id="assetNumber"
              value={equipment.assetNumber ?? ""}
              onChange={(event) =>
                updateField("assetNumber", event.target.value)
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <Select
              value={equipment.status}
              onValueChange={(value) => {
                if (value) {
                  updateField("status", value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {EQUIPMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Condition
            </label>

            <Select
              value={equipment.condition}
              onValueChange={(value) => {
                if (value) {
                  updateField("condition", value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {EQUIPMENT_CONDITIONS.map((condition) => (
                  <SelectItem
                    key={condition}
                    value={condition}
                  >
                    {condition.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Ownership
            </label>

            <Select
              value={equipment.ownership}
              onValueChange={(value) => {
                if (value) {
                  updateField("ownership", value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {EQUIPMENT_OWNERSHIPS.map((ownership) => (
                  <SelectItem
                    key={ownership}
                    value={ownership}
                  >
                    {ownership.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="purchaseDate"
              className="mb-2 block text-sm font-medium"
            >
              Purchase Date
            </label>
            <input
              id="purchaseDate"
              type="date"
              value={
                equipment.purchaseDate
                  ? equipment.purchaseDate.slice(0, 10)
                  : ""
              }
              onChange={(event) =>
                updateField(
                  "purchaseDate",
                  event.target.value
                    ? `${event.target.value}T00:00:00.000Z`
                    : null,
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="purchaseCost"
              className="mb-2 block text-sm font-medium"
            >
              Purchase Cost
            </label>
            <input
              id="purchaseCost"
              type="number"
              min="0"
              step="0.01"
              value={equipment.purchaseCost ?? ""}
              onChange={(event) =>
                updateField(
                  "purchaseCost",
                  event.target.value,
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            Description
          </label>

          <textarea
            id="description"
            value={equipment.description ?? ""}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium"
          >
            Notes
          </label>

          <textarea
            id="notes"
            value={equipment.notes ?? ""}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-6">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? "Deleting..." : "Delete Equipment"}
          </Button>

          <div className="flex gap-3">
            <Link href="/dashboard/equipment">
              <Button
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={saving || deleting}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
