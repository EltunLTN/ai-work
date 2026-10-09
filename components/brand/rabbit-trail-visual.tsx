"use client";

import { motion } from "framer-motion";
import { RabbitMark } from "@/components/brand/rabbit-mark";

export function RabbitTrailVisual() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 p-8">
      <motion.div
        className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent"
        animate={{ x: ["-30%", "30%", "-30%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative mx-auto w-fit text-white"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <RabbitMark className="h-36 w-36" />
      </motion.div>
      <div className="mx-auto mt-4 h-3 w-3 rounded-full bg-red-400 shadow-[0_0_34px_rgba(239,68,68,1)]" />
    </div>
  );
}