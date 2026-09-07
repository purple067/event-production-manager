"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type DeleteEventButtonProps = {
  eventId: number;
};

export function DeleteEventButton({
  eventId,
}: DeleteEventButtonProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this event? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/events/${eventId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete event.",
        );
      }

      router.push("/dashboard/events");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete event.",
      );

      setDeleting(false);
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "Deleting..." : "Delete Event"}
    </Button>
  );
}
