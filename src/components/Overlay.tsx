"use client";

import { motion, AnimatePresence } from "framer-motion";

interface OverlayProps {
  showScrollHint: boolean;
}

/** Minimal, wordless chrome — a single scroll cue that disappears for good. */
export function Overlay({ showScrollHint }: OverlayProps) {
  return (
    <AnimatePresence>
      {showScrollHint && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex flex-col items-center gap-3 text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <span className="text-xs font-light uppercase tracking-[0.35em]">Scroll</span>
          <motion.span
            className="h-8 w-px bg-white/50"
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
