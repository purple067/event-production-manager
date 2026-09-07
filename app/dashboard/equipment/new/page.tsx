"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
};

const statuses = [
  "AVAILABLE",
  "IN_USE",
  "RESERVED",
  "MAINTENANCE",
  "DAMAGED",
  "LOST",
  "RETIRED",
] as const;

const conditions = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "NON_FUNCTIONAL",
] as const;

const ownerships = [
  "OWNED",
  "RENTED",
  "LEASED",
  "CLIENT_PROVIDED",
  "VENDOR_PROVIDED",
] as const;

export default function NewEquipmentPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("AVAILABLE");
  const [condition, setCondition] = useState("GOOD");
  const [ownership, setOwnership] = useState("OWNED");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(
          "/api/equipment/categories",
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.error || "Failed to load equipment categories.",
          );
          return;
        }

        setCategories(data.categories);
      } catch {
        setError("Failed to load equipment categories.");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!categoryId) {
      setError("Please select an equipment category.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          manufacturer: manufacturer.trim() || null,
          model: model.trim() || null,
          serialNumber: serialNumber.trim() || null,
          assetNumber: assetNumber.trim() || null,
          quantity: Number(quantity),
          status,
          condition,
          ownership,
          purchaseDate: purchaseDate
            ? new Date(purchaseDate).toISOString()
            : null,
          purchaseCost: purchaseCost
            ? Number(purchaseCost)
            : null,
          categoryId: Number(categoryId),
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Failed to create equipment.",
        );
        return;
      }

      router.push("/dashboard/equipment");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Add Equipment
        </h1>

        <p className="text-sm text-muted-foreground">
          Add a piece of equipment to your production inventory.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium"
                >
                  Equipment Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Yamaha TF5"
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="text-sm font-medium"
                >
                  Category
                </label>

                <Select
                  value={categoryId}
                  onValueChange={(value) => setCategoryId(value ?? "")}
                  disabled={loadingCategories}
                >
                  <SelectTrigger
                    id="category"
                    className="w-full"
                  >
                    <SelectValue
                      placeholder={
                        loadingCategories
                          ? "Loading categories..."
                          : "Select category"
                      }
                    />
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

              <div className="space-y-2">
                <label
                  htmlFor="quantity"
                  className="text-sm font-medium"
                >
                  Quantity
                </label>

                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="manufacturer"
                  className="text-sm font-medium"
                >
                  Manufacturer
                </label>

                <input
                  id="manufacturer"
                  type="text"
                  value={manufacturer}
                  onChange={(event) =>
                    setManufacturer(event.target.value)
                  }
                  placeholder="Yamaha"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="model"
                  className="text-sm font-medium"
                >
                  Model
                </label>

                <input
                  id="model"
                  type="text"
                  value={model}
                  onChange={(event) =>
                    setModel(event.target.value)
                  }
                  placeholder="TF5"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="serialNumber"
                  className="text-sm font-medium"
                >
                  Serial Number
                </label>

                <input
                  id="serialNumber"
                  type="text"
                  value={serialNumber}
                  onChange={(event) =>
                    setSerialNumber(event.target.value)
                  }
                  placeholder="SN-123456"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="assetNumber"
                  className="text-sm font-medium"
                >
                  Asset Number
                </label>

                <input
                  id="assetNumber"
                  type="text"
                  value={assetNumber}
                  onChange={(event) =>
                    setAssetNumber(event.target.value)
                  }
                  placeholder="EPM-AUD-001"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
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
                    setStatus(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="condition"
                  className="text-sm font-medium"
                >
                  Condition
                </label>

                <select
                  id="condition"
                  value={condition}
                  onChange={(event) =>
                    setCondition(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {conditions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ownership"
                  className="text-sm font-medium"
                >
                  Ownership
                </label>

                <select
                  id="ownership"
                  value={ownership}
                  onChange={(event) =>
                    setOwnership(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {ownerships.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="purchaseDate"
                  className="text-sm font-medium"
                >
                  Purchase Date
                </label>

                <input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(event) =>
                    setPurchaseDate(event.target.value)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="purchaseCost"
                  className="text-sm font-medium"
                >
                  Purchase Cost
                </label>

                <input
                  id="purchaseCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseCost}
                  onChange={(event) =>
                    setPurchaseCost(event.target.value)
                  }
                  placeholder="250000"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
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
                  rows={3}
                  placeholder="32-channel digital mixing console."
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
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
                  rows={3}
                  placeholder="Additional maintenance or inventory notes."
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
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
                disabled={saving || loadingCategories}
              >
                {saving
                  ? "Adding Equipment..."
                  : "Add Equipment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}