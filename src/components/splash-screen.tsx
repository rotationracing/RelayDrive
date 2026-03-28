"use client";

import { useEffect } from "react";

export type SplashPhase = "enter" | "show" | "exit";

export function SplashScreen({ phase }: { phase: SplashPhase }) {
  return (
    <div
      className={`fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        className={`text-center transition-all duration-700 ${
          phase === "enter" ? "translate-y-8 opacity-0 scale-95" : ""
        } ${
          phase === "show" ? "translate-y-0 opacity-100 scale-100 animate-splash-pop" : ""
        } ${phase === "exit" ? "opacity-0 scale-95" : ""}`}
      >
        <h1 className="text-5xl font-bold">
          <span>RelayDrive</span>
        </h1>
      </div>
      <style jsx global>{`
        @keyframes splash-pop {
          0% {
            transform: scale(0.95);
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-splash-pop {
          animation: splash-pop 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
