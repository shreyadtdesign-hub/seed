"use client";

import { motion, AnimatePresence } from "framer-motion";

interface IntroProps {
  visible: boolean;
}

export function Intro({ visible }: IntroProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h1
            className="px-6 text-center font-serif text-3xl font-light tracking-[0.2em] text-white/90 sm:text-5xl md:text-6xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Journey of a Seed
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
