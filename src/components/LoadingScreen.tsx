"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  ready: boolean;
  onDone?: () => void;
}

/** Premium black loader: eases toward 90% while waiting, snaps to 100% on ready. */
export function LoadingScreen({ ready, onDone }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 700);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + (90 - prev) * 0.08 : prev));
    }, 100);
    return () => clearInterval(interval);
  }, [ready, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="h-px w-40 overflow-hidden bg-white/15">
            <motion.div
              className="h-full bg-white/80"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs font-light uppercase tracking-[0.35em] text-white/50">
            {Math.round(progress)}%
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
