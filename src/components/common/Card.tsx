import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, type MotionStyle } from "framer-motion";

interface Props { children: ReactNode; className?: string; style?: MotionStyle; delay?: number; }

export function Card({ children, className = "", style, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current?.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current?.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <motion.div ref={ref} className={`card ${className}`} style={style} onMouseMove={onMove}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="spot" aria-hidden />
      {children}
    </motion.div>
  );
}
