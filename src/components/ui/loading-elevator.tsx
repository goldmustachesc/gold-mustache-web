"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface LoadingElevatorProps {
  readonly open: boolean;
  readonly onAnimationComplete?: () => void;
}

export function LoadingElevator({
  open,
  onAnimationComplete,
}: Readonly<LoadingElevatorProps>) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Dark Background */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 bg-[#0B0B0B]"
      />

      {/* Left Door */}
      <motion.div
        initial={{ x: "0%" }}
        animate={{ x: open ? "-100%" : "0%" }}
        transition={{
          duration: 1,
          ease: [0.65, 0, 0.35, 1], // Custom ease for smooth premium feel
        }}
        className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37]"
        style={{
          boxShadow: "4px 0 32px rgba(212, 175, 55, 0.5)",
        }}
      />

      {/* Right Door */}
      <motion.div
        initial={{ x: "0%" }}
        animate={{ x: open ? "100%" : "0%" }}
        transition={{
          duration: 1,
          ease: [0.65, 0, 0.35, 1],
        }}
        onAnimationComplete={() => {
          if (open && onAnimationComplete) {
            onAnimationComplete();
          }
        }}
        className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#D4AF37] via-[#E5C158] to-[#D4AF37]"
        style={{
          boxShadow: "-4px 0 32px rgba(212, 175, 55, 0.5)",
        }}
      />

      {/* Center Logo with Enhanced Contrast */}
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: open ? 0 : 1,
          scale: open ? 0.8 : 1,
        }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* White glow behind logo for contrast */}
        <div className="absolute w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 rounded-full bg-white/20 blur-3xl" />

        <div className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 z-10">
          <Image
            src="/logo.png"
            alt="Gold Mustache"
            fill
            className="object-contain"
            style={{
              filter:
                "drop-shadow(0 0 40px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.6))",
            }}
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}
