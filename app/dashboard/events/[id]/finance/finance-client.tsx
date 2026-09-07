"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";

type Budget = {
  id: number;
  eventId: number;
  totalBudget: string;
  currency: string;
  notes: string | null;
};

type BudgetItem = {
  id: number;
  budgetId: number;
  category: string;
  description: string | null;
  estimatedCost: string;
  actualCost: string;
  notes: string | null;
};

type ItemForm = {
  category: string;
  description: string;
  estimatedCost: string;
  actualCost: string;
  notes: string;
};

const emptyForm: ItemForm = {
  category: "",
  description: "",
  estimatedCost: "",
  actualCost: "0",
  notes: "",
};

function money(value: number, currency = "NPR") {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function FinanceClient({ eventId }: { eventId: string }) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  async function loadFinance() {
    try {
      setLoading(true);
      setError("");

      const [budgetResponse, itemsResponse] = await Promise.all([
        fetch(`/api/events/${eventId}/budget`),
        fetch(`/api/events/${eventId}/budget/items`),
      ]);

      if (!budgetResponse.ok) {
        throw new Error("Failed to load budget.");
      }

      const budgetData = await budgetResponse.json();
      setBudget(budgetData.budget);

      if (budgetData.budget) {
        if (!itemsResponse.ok) {
          throw new Error("Failed to load budget items.");
        }

        const itemsData = await itemsResponse.json();
        setItems(itemsData.items ?? []);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, [eventId]);

  const totals = useMemo(() => {
    const estimated = items.reduce(
      (sum, item) => sum + Number(item.estimatedCost),
      0,
    );

    const actual = items.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0,
    );

    const totalBudget = Number(budget?.totalBudget ?? 0);

    return {
      totalBudget,
      estimated,
      actual,
      remaining: totalBudget - actual,
    };
  }, [budget, items]);

  function updateForm(field: keyof ItemForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEdit(item: BudgetItem) {
    setEditingId(item.id);

    setForm({
      category: item.category,
      description: item.description ?? "",
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      notes: item.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!budget) return;

    if (!form.category.trim()) {
      setError("Category is required.");
      return;
    }

    if (Number(form.estimatedCost) < 0 || Number(form.actualCost) < 0) {
      setError("Costs cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        category: form.category,
        description: form.description || null,
        estimatedCost: Number(form.estimatedCost),
        actualCost: Number(form.actualCost || 0),
        notes: form.notes || null,
      };

      const response = editingId
        ? await fetch(
            `/api/events/${eventId}/budget/items/${editingId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          )
        : await fetch(`/api/events/${eventId}/budget/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save budget item.");
      }

      cancelEdit();
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget item?",
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/budget/items/${id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete budget item.");
      }

      if (editingId === id) {
        cancelEdit();
      }

      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading finance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Manage the event budget and production costs.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!budget ? (
        <Card>
          <CardHeader>
            <CardTitle>No budget configured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This event does not have a budget yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {money(totals.totalBudget, budget.currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {money(totals.estimated, budget.currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Actual Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {money(totals.actual, budget.currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {money(totals.remaining, budget.currency)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Budget Items</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Track planned and actual production costs.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      cancelEdit();

                      window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: "smooth",
                      });

                      window.setTimeout(() => {
                        categoryInputRef.current?.focus();
                      }, 400);
                    }}
                  >
                    Add Item
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="font-medium">No budget items yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add your first production cost.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="px-3 py-3 font-medium">Category</th>
                          <th className="px-3 py-3 font-medium">
                            Description
                          </th>
                          <th className="px-3 py-3 text-right font-medium">
                            Estimated
                          </th>
                          <th className="px-3 py-3 text-right font-medium">
                            Actual
                          </th>
                          <th className="px-3 py-3 text-right font-medium">
                            Variance
                          </th>
                          <th className="px-3 py-3 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.map((item) => {
                          const estimated = Number(item.estimatedCost);
                          const actual = Number(item.actualCost);
                          const variance = estimated - actual;

                          return (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="px-3 py-4 font-medium">
                                {item.category}
                              </td>

                              <td className="max-w-xs px-3 py-4 text-muted-foreground">
                                {item.description || "—"}
                              </td>

                              <td className="px-3 py-4 text-right">
                                {money(estimated, budget.currency)}
                              </td>

                              <td className="px-3 py-4 text-right">
                                {money(actual, budget.currency)}
                              </td>

                              <td className="px-3 py-4 text-right">
                                {money(variance, budget.currency)}
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEdit(item)}
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteItem(item.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? "Edit Budget Item" : "Add Budget Item"}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={saveItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      ref={categoryInputRef}
                      id="category"
                      value={form.category}
                      onChange={(e) =>
                        updateForm("category", e.target.value)
                      }
                      placeholder="Audio"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) =>
                        updateForm("description", e.target.value)
                      }
                      placeholder="PA system and FOH production"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedCost">Estimated Cost</Label>
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.estimatedCost}
                        onChange={(e) =>
                          updateForm("estimatedCost", e.target.value)
                        }
                        placeholder="250000"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actualCost">Actual Cost</Label>
                      <Input
                        id="actualCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.actualCost}
                        onChange={(e) =>
                          updateForm("actualCost", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateForm("notes", e.target.value)}
                      placeholder="Additional production cost details..."
                      className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Update Item"
                          : "Add Item"}
                    </Button>

                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
