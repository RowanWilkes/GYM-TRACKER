"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";
import { toSentenceCase, type DayRow } from "@/lib/types";
import LiftLoader from "@/components/LiftLoader";

type DraftDay = {
  id: string;
  name: string;
  persisted: boolean;
  editing: boolean;
};

export function TrainingDaysEditor() {
  const router = useRouter();
  const [days, setDays] = useState<DraftDay[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setError(userErr?.message || "You need to be signed in.");
        setLoading(false);
        return;
      }
      const { data, error: daysError } = await supabase
        .from("days")
        .select("id, user_id, name, position, sort_order")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (daysError) {
        setError(daysError.message);
        setLoading(false);
        return;
      }
      setDays(
        ((data ?? []) as DayRow[]).map((day) => ({
          id: day.id,
          name: day.name,
          persisted: true,
          editing: false,
        }))
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setDay(id: string, patch: Partial<DraftDay>) {
    setDays((prev) => prev.map((day) => (day.id === id ? { ...day, ...patch } : day)));
  }

  function startRename(id: string) {
    setDays((prev) =>
      prev.map((day) => ({ ...day, editing: day.id === id }))
    );
  }

  function removeDay(id: string) {
    const day = days.find((d) => d.id === id);
    if (day?.persisted) {
      setRemovedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    }
    setDays((prev) => prev.filter((d) => d.id !== id));
  }

  function addDay() {
    const id = `local-${crypto.randomUUID()}`;
    setDays((prev) => [
      ...prev.map((day) => ({ ...day, editing: false })),
      { id, name: "", persisted: false, editing: true },
    ]);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDays((items) => {
      const oldIndex = items.findIndex((day) => day.id === active.id);
      const newIndex = items.findIndex((day) => day.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function saveChanges() {
    const trimmed = days.map((day) => ({ ...day, name: day.name.trim() }));
    if (trimmed.some((day) => !day.name)) {
      setError("Name every day before saving.");
      return;
    }
    setSaving(true);
    setError("");
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error("days save skipped: no user", {
        message: userErr?.message,
        code: userErr?.code,
        error: userErr,
      });
      setError(userErr?.message || "You need to be signed in.");
      setSaving(false);
      return;
    }

    try {
      for (let i = 0; i < trimmed.length; i += 1) {
        const day = trimmed[i];
        if (day.persisted) {
          const { error: updateError } = await supabase
            .from("days")
            .update({ name: day.name, sort_order: i })
            .eq("id", day.id)
            .eq("user_id", user.id);
          if (updateError) {
            console.error("days update failed", {
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
              error: updateError,
            });
            throw updateError;
          }
        } else {
          const payload = {
            user_id: user.id,
            name: day.name,
            sort_order: i,
            position: i,
          };
          const { error: insertError } = await supabase.from("days").insert(payload);
          if (insertError) {
            console.error("days insert failed", {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              error: insertError,
            });
            throw insertError;
          }
        }
      }
      for (const id of removedIds) {
        const { error: archiveError } = await supabase
          .from("days")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", user.id);
        if (archiveError) {
          console.error("days archive failed", {
            message: archiveError.message,
            code: archiveError.code,
            details: archiveError.details,
            error: archiveError,
          });
          throw archiveError;
        }
      }
      router.push("/tracker");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your days.";
      setError(message);
      setSaving(false);
    }
  }

  if (loading) {
    return <LiftLoader />;
  }

  return (
    <div className="tracker-root days-root">
      <header className="days-header">
        <button
          className="days-back"
          type="button"
          aria-label="Back"
          onClick={() => router.push("/tracker")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="days-title">Your training days</h1>
      </header>
      <p className="days-subtitle">Drag to reorder. These become your day tabs.</p>

      {error ? <p className="inline-error t-body">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={days.map((day) => day.id)} strategy={verticalListSortingStrategy}>
          <ul className="days-list">
            {days.map((day) => (
              <SortableDayRow
                key={day.id}
                day={day}
                onRename={() => startRename(day.id)}
                onChangeName={(name) => setDay(day.id, { name })}
                onFinishRename={() => setDay(day.id, { editing: false })}
                onRemove={() => removeDay(day.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button className="days-add t-value" type="button" onClick={addDay}>
        + Add day
      </button>

      <button
        className="days-save t-value"
        type="button"
        disabled={saving}
        onClick={saveChanges}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function SortableDayRow({
  day,
  onRename,
  onChangeName,
  onFinishRename,
  onRemove,
}: {
  day: DraftDay;
  onRename: () => void;
  onChangeName: (name: string) => void;
  onFinishRename: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className={`days-card ${day.editing ? "is-editing" : ""}`}>
      <button
        type="button"
        className="days-grip"
        aria-label={`Reorder ${day.name || "day"}`}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      {day.editing ? (
        <input
          className="days-name-input t-value"
          value={day.name}
          autoFocus
          placeholder="Day name"
          onChange={(e) => onChangeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onFinishRename();
          }}
        />
      ) : (
        <button type="button" className="days-name t-value" onClick={onRename}>
          {toSentenceCase(day.name) || "Untitled"}
        </button>
      )}
      <div className="days-row-actions">
        <button type="button" className="days-icon-btn" aria-label={`Rename ${day.name || "day"}`} onClick={onRename}>
          <PencilIcon />
        </button>
        <button type="button" className="days-icon-btn" aria-label={`Remove ${day.name || "day"} from list`} onClick={onRemove}>
          <CloseIcon />
        </button>
      </div>
    </li>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 24" width="14" height="20" aria-hidden="true">
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="5" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" />
      <circle cx="5" cy="19" r="1.5" fill="currentColor" />
      <circle cx="11" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
