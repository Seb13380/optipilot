"use client";
import { motion } from "framer-motion";

interface OptiPilotHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export default function OptiPilotHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
}: OptiPilotHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4"
      style={{ background: "#0A0338", borderBottom: "1px solid rgba(83,49,208,0.35)" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-[80px]">
        {showBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="flex items-center gap-1 font-medium text-base"
            style={{ color: "#9B96DA" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path
                d="M15 19l-7-7 7-7"
                stroke="#9B96DA"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Retour
          </motion.button>
        )}
      </div>

      {/* Center — Logo ou Titre */}
      <div className="flex flex-col items-center">
        {!title ? (
          <>
            <div className="flex items-center gap-2">
              <img
                src="/assets/images/logo-OptiPilot.png"
                alt="OptiPilot"
                className="h-8 w-auto object-contain"
              />
            </div>
          </>
        ) : (
          <span className="text-lg font-semibold" style={{ color: "#FDFDFE" }}>
            {title}
          </span>
        )}
      </div>

      {/* Right */}
      <div className="min-w-[80px] flex justify-end">
        {rightAction || (
          <button className="p-2 rounded-xl" style={{ color: "#9B96DA" }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
