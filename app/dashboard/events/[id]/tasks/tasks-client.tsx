"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";

type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED";

type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  notes: string | null;
  eventId: number;
  departmentId: number | null;
  crewMemberId: number | null;
  createdAt: string;
  updatedAt: string;
};

type Department = {
  id: number;
  name: string;
  type: string;
};

type CrewMember = {
  id: number;
  name: string;
  designation: string | null;
};

type Props = {
  eventId: number;
  eventName: string;
  departments: Department[];
  crewMembers: CrewMember[];
};

type FormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  departmentId: string;
  crewMemberId: string;
  notes: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: "",
  departmentId: "",
  crewMemberId: "",
  notes: "",
};

function formatDateTime(value: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function statusLabel(status: TaskStatus) {
  return status.replace("_", " ");
}

function priorityLabel(priority: TaskPriority) {
  return priority;
}

export default function TasksClient({
  eventId,
  eventName,
  departments,
  crewMembers,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadTasks() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/events/${eventId}/tasks`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load tasks.");
      }

      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tasks.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, [eventId]);

  function openAddForm() {
    setEditingTaskId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(task: Task) {
    setEditingTaskId(task.id);

    setForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: toDateTimeLocal(task.dueDate),
      departmentId: task.departmentId
        ? String(task.departmentId)
        : "",
      crewMemberId: task.crewMemberId
        ? String(task.crewMemberId)
        : "",
      notes: task.notes ?? "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingTaskId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
        departmentId: form.departmentId
          ? Number(form.departmentId)
          : null,
        crewMemberId: form.crewMemberId
          ? Number(form.crewMemberId)
          : null,
        notes: form.notes.trim() || null,
      };

      const url = editingTaskId
        ? `/api/events/${eventId}/tasks/${editingTaskId}`
        : `/api/events/${eventId}/tasks`;

      const response = await fetch(url, {
        method: editingTaskId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save task.");
      }

      setSuccess(
        editingTaskId
          ? "Task updated successfully."
          : "Task created successfully.",
      );

      setShowForm(false);
      setEditingTaskId(null);
      setForm(initialForm);

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?",
    );

    if (!confirmed) return;

    try {
      setDeletingTaskId(taskId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/events/${eventId}/tasks/${taskId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete task.");
      }

      setSuccess("Task deleted successfully.");

      if (editingTaskId === taskId) {
        closeForm();
      }

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete task.",
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Production Tasks
          </h1>

          <p className="text-sm text-muted-foreground">
            {eventName}
          </p>
        </div>

        {!showForm && (
          <Button onClick={openAddForm}>
            + Add Task
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                {editingTaskId ? "Edit Task" : "Add Task"}
              </CardTitle>

              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-title">
                    Task Title
                  </Label>

                  <Input
                    id="task-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        title: event.target.value,
                      })
                    }
                    placeholder="e.g. FOH console setup"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-description">
                    Description
                  </Label>

                  <textarea
                    id="task-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description: event.target.value,
                      })
                    }
                    placeholder="Describe what needs to be done..."
                    disabled={saving}
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>

                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        status: (value ?? "TODO") as TaskStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="TODO">
                        To Do
                      </SelectItem>

                      <SelectItem value="IN_PROGRESS">
                        In Progress
                      </SelectItem>

                      <SelectItem value="BLOCKED">
                        Blocked
                      </SelectItem>

                      <SelectItem value="DONE">
                        Done
                      </SelectItem>

                      <SelectItem value="CANCELLED">
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>

                  <Select
                    value={form.priority}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        priority: (value ?? "MEDIUM") as TaskPriority,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="LOW">
                        Low
                      </SelectItem>

                      <SelectItem value="MEDIUM">
                        Medium
                      </SelectItem>

                      <SelectItem value="HIGH">
                        High
                      </SelectItem>

                      <SelectItem value="CRITICAL">
                        Critical
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-due-date">
                    Due Date & Time
                  </Label>

                  <Input
                    id="task-due-date"
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dueDate: event.target.value,
                      })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>

                  <Select
                    value={form.departmentId}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        departmentId: value ?? "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>

                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem
                          key={department.id}
                          value={String(department.id)}
                        >
                          {department.name} · {department.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Crew Member</Label>

                  <Select
                    value={form.crewMemberId}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        crewMemberId: value ?? "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select crew member" />
                    </SelectTrigger>

                    <SelectContent>
                      {crewMembers.map((crew) => (
                        <SelectItem
                          key={crew.id}
                          value={String(crew.id)}
                        >
                          {crew.name}
                          {crew.designation
                            ? ` · ${crew.designation}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="task-notes">
                    Notes
                  </Label>

                  <textarea
                    id="task-notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Additional production notes..."
                    disabled={saving}
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingTaskId
                      ? "Update Task"
                      : "Create Task"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading tasks...
            </p>
          ) : tasks.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="font-medium">
                No production tasks yet.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add your first production task to start planning.
              </p>

              <Button
                className="mt-4"
                onClick={openAddForm}
              >
                + Add Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const department = departments.find(
                  (item) => item.id === task.departmentId,
                );

                const crew = crewMembers.find(
                  (item) => item.id === task.crewMemberId,
                );

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">
                            {task.title}
                          </h3>

                          <Badge variant="outline">
                            {statusLabel(task.status)}
                          </Badge>

                          <Badge>
                            {priorityLabel(task.priority)}
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                          {department && (
                            <span>
                              Department: {department.name}
                            </span>
                          )}

                          {crew && (
                            <span>
                              Crew: {crew.name}
                            </span>
                          )}

                          <span>
                            Due: {formatDateTime(task.dueDate)}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <span className="font-medium">
                              Notes:
                            </span>{" "}
                            {task.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openEditForm(task)}
                          disabled={deletingTaskId === task.id}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(task.id)}
                          disabled={deletingTaskId === task.id}
                        >
                          {deletingTaskId === task.id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
