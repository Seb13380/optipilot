"use client";
import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface CardButtonProps {
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
  lineColor?: string;  // couleur de la ligne au survol, défaut blanc
  disabled?: boolean;
}

/**
 * Bouton carte avec effet cc-card-line :
 * une ligne s'étend du bord gauche au bord droit au survol/tap.
 * Compatible souris ET touch (iPad/iPhone).
 */
export default function CardButton({
  onClick, style, className = "", children, lineColor = "rgba(255,255,255,0.55)", disabled,
}: CardButtonProps) {
  return (
    <motion.button
      initial="rest"
      whileHover="hover"
      whileTap="hover"
      animate="rest"
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      style={style}
      variants={{ rest: { y: 0 }, hover: { y: -5 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
      {/* Ligne qui s'allonge — cc-card-line */}
      <motion.div
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 3,
          background: lineColor,
          transformOrigin: "left",
          borderRadius: "0 0 24px 24px",
          pointerEvents: "none",
        }}
      />
    </motion.button>
  );
}
