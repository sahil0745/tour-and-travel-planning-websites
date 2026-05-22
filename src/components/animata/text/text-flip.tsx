"use client";

import { useMemo } from "react";

export default function TextFlip() {
  const words = useMemo(() => ["Not Harder", "Not Harder", "Not Harder", "Not Harder", "Not Harder"], []);

  return (
    <span className="inline-flex relative align-bottom pb-2">
      <span className="flex flex-col overflow-hidden h-[1.1em]">
        {words.map((word, index) => (
          <span key={index} className="animate-flip-words shrink-0 text-gradient text-glow leading-[1.1]">
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}
