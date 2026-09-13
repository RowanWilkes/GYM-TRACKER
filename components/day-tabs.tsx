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

  const FADE_THRESHOLD = 24; // px — ignore the ~16px peek spacer + gap so the fade only appears on real overflow

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowLeftFade(el.scrollLeft > FADE_THRESHOLD);
    setShowRightFade(maxScroll - el.scrollLeft > FADE_THRESHOLD);
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
