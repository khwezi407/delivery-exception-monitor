import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import { STATE_NAME } from "../../data/corridor";
import type { ShipmentState } from "../../types";
import { toCsv, downloadText } from "../../lib/helpers";

interface Cmd { label: string; hint: string; run: () => void; }
type FilterOption = ShipmentState | "ALL";
const STATES: FilterOption[] = ["ALL", "EXCEPTION", "AT_RISK", "ON_TIME", "COMPLETE"];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ]     = useState("");
  const [idx, setIdx] = useState(0);
  const data          = useStore((s) => s.data);
  const refresh       = useStore((s) => s.refresh);
  const setFilter     = useStore((s) => s.setFilter);
  const select        = useStore((s) => s.select);
  const setLastAction = useStore((s) => s.setLastAction);

  useEffect(() => { if (open) { setQ(""); setIdx(0); } }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      { label: "Refresh corridor", hint: "action", run: () => refresh() },
      { label: "Export shipments CSV", hint: "download", run: () => {
          if (!data) return;
          const rows = [["ID","State","Latest","Next","Expected"],
            ...data.shipments.map((s) => [s.shipment_id, s.state, s.latest, s.next_milestone ?? "", s.next_expected_at ?? ""])];
          downloadText("shipments.csv", toCsv(rows), "text/csv");
          setLastAction("Shipments exported.");
        }
      },
    ];
    for (const st of STATES) {
      list.push({ label: `Show ${st === "ALL" ? "all shipments" : STATE_NAME[st]}`, hint: "filter",
        run: () => setFilter(st) });
    }
    if (data) {
      for (const s of data.shipments) {
        list.push({ label: `${s.shipment_id}`, hint: STATE_NAME[s.state], run: () => select(s.shipment_id) });
      }
    }
    return list;
  }, [data, refresh, setFilter, select, setLastAction]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? cmds.filter((c) => c.label.toLowerCase().includes(t)) : cmds).slice(0, 12);
  }, [q, cmds]);

  useEffect(() => setIdx((i) => Math.min(i, Math.max(0, filtered.length - 1))), [filtered.length]);

  function run(i: number) { onClose(); filtered[i]?.run(); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div className="pbox" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.14 }}>
            <div style={{ position: "relative" }}>
              <Search size={17} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.45 }} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Type a command, shipment or state" style={{ paddingLeft: 44 }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % Math.max(1, filtered.length)); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); setIdx((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length)); }
                  if (e.key === "Enter")     { e.preventDefault(); run(idx); }
                  if (e.key === "Escape")    onClose();
                }} />
            </div>
            <ul role="listbox">
              {filtered.length === 0 && <li style={{ color: "var(--faint)" }}>No matches</li>}
              {filtered.map((c, i) => (
                <li key={i} role="option" aria-selected={i === idx} onMouseEnter={() => setIdx(i)} onClick={() => run(i)}>
                  <span>{c.label}</span>
                  <small>{c.hint}</small>
                </li>
              ))}
            </ul>
            <div className="p-foot"><span>↑↓ move</span><span>Enter run</span><span>Esc close</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
