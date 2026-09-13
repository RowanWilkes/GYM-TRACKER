"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type DayRow, toSentenceCase } from "@/lib/types";

type DayTabsProps = {
  days: DayRow[];
  dayId: string | null;
  onSelect: (id: string) => void;
};

export function DayTabs({ days, dayId, onSelect }: DayTabsProps) {
  const scrollerRef = useRef<HTMLElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 1);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    const observer = new ResizeObserver(updateFades);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
      observer.disconnect();
    };
  }, [updateFades, days]);

  return (
    <div className="tabs-wrap">
      <nav
        ref={scrollerRef}
        className="tabs"
        role="tablist"
        aria-label="Training days"
      >
        {days.map((day) => (
          <button
            key={day.id}
            className={`tab t-body ${day.id === dayId ? "is-active" : ""}`}
            type="button"
            onClick={() => onSelect(day.id)}
          >
            {toSentenceCase(day.name)}
          </button>
        ))}
        <span className="tabs-peek" aria-hidden="true" />
      </nav>
      <div
        className={`tabs-fade tabs-fade-left ${showLeftFade ? "is-visible" : ""}`}
        aria-hidden="true"
      />
      <div
        className={`tabs-fade tabs-fade-right ${showRightFade ? "is-visible" : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}
