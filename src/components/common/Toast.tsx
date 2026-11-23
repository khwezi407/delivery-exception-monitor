import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../../store/useStore";

export function Toast() {
  const msg = useStore((s) => s.lastAction);
  const set  = useStore((s) => s.setLastAction);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => set(null), 3500);
    return () => clearTimeout(t);
  }, [msg, set]);
  return (
    <AnimatePresence>
      {msg && (
        <motion.div className="toast" role="status"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
