"use client";

import { useEffect, useRef, useState } from "react";

export default function CursorPandaFollower() {
  const pandaRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const mouse = useRef({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const animate = () => {
      const ease = 0.08;
      const dx = mouse.current.x - pos.current.x;
      const dy = mouse.current.y - pos.current.y;
      pos.current.x += dx * ease;
      pos.current.y += dy * ease;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (pandaRef.current) {
        pandaRef.current.style.transform = `translate3d(${pos.current.x - 16}px, ${
          pos.current.y - 16
        }px, 0) rotate(${angle > 90 || angle < -90 ? -10 : 10}deg)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={pandaRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden lg:block transition-opacity duration-300"
      style={{ willChange: "transform" }}
    >
      <div className="relative w-8 h-8 drop-shadow-[0_4px_12px_rgba(49,106,255,0.3)]">
        {/* Soft Blue Glow Behind Panda */}
        <div className="absolute inset-0 bg-[#316AFF]/20 rounded-full blur-md" />

        {/* Cute Panda SVG */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10"
        >
          {/* Ears */}
          <circle cx="16" cy="18" r="9" fill="#1E293B" />
          <circle cx="48" cy="18" r="9" fill="#1E293B" />

          {/* Head Base */}
          <circle
            cx="32"
            cy="34"
            r="22"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="2"
          />

          {/* Eye Patches */}
          <ellipse
            cx="22"
            cy="32"
            rx="6"
            ry="8"
            fill="#1E293B"
            transform="rotate(-15 22 32)"
          />
          <ellipse
            cx="42"
            cy="32"
            rx="6"
            ry="8"
            fill="#1E293B"
            transform="rotate(15 42 32)"
          />

          {/* Eyes (Glowing HR Blue) */}
          <circle cx="23" cy="31" r="2.5" fill="#316AFF" />
          <circle cx="41" cy="31" r="2.5" fill="#316AFF" />
          <circle cx="24" cy="30" r="1" fill="#FFFFFF" />
          <circle cx="42" cy="30" r="1" fill="#FFFFFF" />

          {/* Nose & Mouth */}
          <ellipse cx="32" cy="38" rx="3.5" ry="2.5" fill="#1E293B" />
          <path
            d="M29 42Q32 44 35 42"
            stroke="#1E293B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
