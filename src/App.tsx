import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, RefreshCw, Command, Download, Zap, AlertTriangle,
  Clock, Layers,
} from "lucide-react";
import { useStore } from "./store/useStore";
import { Card } from "./components/common/Card";
import { Toast } from "./components/common/Toast";
import { CommandPalette } from "./components/common/CommandPalette";
import { CorridorMap } from "./components/corridor/CorridorMap";
import { ShipmentTimeline } from "./components/shipment/ShipmentTimeline";
import { SlaTracker } from "./components/shipment/SlaTracker";
import { KpiCard } from "./components/kpi/KpiCard";
import { STATE_NAME, SHORT, NICE, MIN } from "./data/corridor";
import { hhmm, relMin, lateMin, toCsv, downloadText } from "./lib/helpers";
import type { ShipmentState } from "./types";

type FilterOption = ShipmentState | "ALL";
const FILTERS: FilterOption[] = ["ALL", "EXCEPTION", "AT_RISK", "ON_TIME", "COMPLETE"];
const F_COLOR: Partial<Record<ShipmentState, string>> = {
  ON_TIME: "var(--ok)", AT_RISK: "var(--risk)", EXCEPTION: "var(--exc)", COMPLETE: "var(--done)",
};

export default function App() {
  const init        = useStore((s) => s.init);
  const load        = useStore((s) => s.load);
  const refresh     = useStore((s) => s.refresh);
  const data        = useStore((s) => s.data);
  const selected    = useStore((s) => s.selected);
  const filter      = useStore((s) => s.filter);
  const query       = useStore((s) => s.query);
  const live        = useStore((s) => s.live);
  const setSelected = useStore((s) => s.select);
  const setFilter   = useStore((s) => s.setFilter);
  const setQuery    = useStore((s) => s.setQuery);
  const setAction   = useStore((s) => s.setLastAction);

  const [pal, setPal]     = useState(false);
  const [clock, setClock] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  /* ── Boot ── */
  useEffect(() => {
    init();
    load();
  }, [init, load]);

  /* ── Live refresh every 60 s ── */
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => load(), 60_000);
    return () => clearInterval(id);
  }, [live, load]);

  /* ── SAST clock ── */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal((p) => !p); }
      if (e.key === "Escape") setPal(false);
      if (e.key === "/" && !inInput) { e.preventDefault(); document.getElementById("search-input")?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🚚</div>
          <div>Loading corridor data…</div>
        </div>
      </div>
    );
  }

  /* ── Derived state ── */
  const { shipments, exceptions, kpis } = data;
  const st      = kpis.states;
  const exc     = st.EXCEPTION ?? 0;
  const risk    = st.AT_RISK   ?? 0;
  const onTime  = st.ON_TIME   ?? 0;
  const done    = st.COMPLETE  ?? 0;
  const total   = shipments.length;

  const shown = shipments
    .filter((s) => (filter === "ALL" || s.state === (filter as ShipmentState)) && (!query || s.shipment_id.toLowerCase().includes(query)))
    .sort((a, b) => {
      const rank = { EXCEPTION: 0, AT_RISK: 1, ON_TIME: 2, COMPLETE: 3 };
      return rank[a.state] - rank[b.state] || a.shipment_id.localeCompare(b.shipment_id);
    });

  const selectedShipment = shipments.find((s) => s.shipment_id === selected);

  /* ── Headline ── */
  const headline = exc > 0
    ? <>{exc} shipment{exc > 1 ? "s" : ""} <em>need{exc > 1 ? "" : "s"} attention</em></>
    : risk > 0
    ? <>{risk} shipment{risk > 1 ? "s" : ""} <em>at risk</em></>
    : <>Every shipment <em>on time</em></>;

  /* ── Controller brief ── */
  const briefText = (() => {
    const parts: string[] = [];
    const lateShips = shipments.filter((s) => s.state === "EXCEPTION");
    const riskShips = shipments.filter((s) => s.state === "AT_RISK");
    if (lateShips.length) parts.push(`${lateShips.map((s) => `${s.shipment_id} (${lateMin(s.next_expected_at)} min overdue)`).join(", ")} — operations and customer service notified.`);
    if (riskShips.length) parts.push(`${riskShips.length} at risk: ${riskShips.map((s) => s.shipment_id).join(", ")}.`);
    if (!lateShips.length && !riskShips.length) parts.push("All shipments are on time.");
    parts.push(`${kpis.duplicates_24h} duplicate events blocked in 24 h — none stored twice.`);
    if (kpis.dlq_depth) parts.push(`${kpis.dlq_depth} message${kpis.dlq_depth > 1 ? "s" : ""} in the dead-letter queue — inspect and redrive.`);
    else parts.push("Dead-letter queue is empty.");
    return parts.join(" ");
  })();

  /* ── CSV export ── */
  function exportCsv() {
    const rows: (string | number | null)[][] = [
      ["Shipment ID", "State", "Latest milestone", "Next milestone", "Next expected", "Open exception"],
      ...shipments.map((s) => {
        const ex = exceptions.find((e) => e.shipment_id === s.shipment_id && e.status === "OPEN");
        return [s.shipment_id, s.state, s.latest, s.next_milestone ?? "", s.next_expected_at ?? "", ex ? ex.level : ""];
      }),
    ];
    downloadText("corridor-shipments.csv", toCsv(rows), "text/csv");
    setAction("Shipments exported as CSV.");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function handleSelect(id: string) {
    setSelected(id);
    if (window.innerWidth < 1050) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  /* ── Render ── */
  return (
    <>
      <div className="wrap">

        {/* ── Top bar ── */}
        <div className="bar">
          <div className="brand">
            <span className="logo">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 15h3.5l3-8 4.5 12 3-7H21" stroke="#1fc9a8" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <b>Delivery Exception Monitor</b>
              <small>Ukhozi Freight · N3 Corridor · Durban → Gauteng</small>
            </div>
          </div>

          <label className="search" htmlFor="search-input" style={{ marginRight: "auto" }}>
            <Search size={16} />
            <span className="kbd-hint">/</span>
            <input id="search-input" type="search" placeholder="Find shipment…" autoComplete="off"
              value={query} onChange={(e) => setQuery(e.target.value.trim().toLowerCase())} />
          </label>

          <span className="clock">{clock || "--:--:--"}<small>SAST</small></span>

          <button className="btn" onClick={() => setPal(true)}>
            <Command size={15} /> Commands <kbd>Ctrl K</kbd>
          </button>
          <button className="btn" onClick={exportCsv} aria-label="Export CSV">
            <Download size={15} /> CSV
          </button>
          <button className="btn primary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={15} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <span className={`live-badge ${live ? "on" : ""}`}><i />{live ? "Live" : "Sample"}</span>
        </div>

        {/* ── Page headline ── */}
        <div className="page-head">
          <h1>{headline}</h1>
          <p className="sub">
            {total} shipments on the N3 corridor · {onTime} on time · {risk} at risk · {exc} exception{exc !== 1 ? "s" : ""} · {done} delivered
            · Updated {hhmm(data.generated_at)}
          </p>
        </div>

        {/* ── Load-shedding resilience banner (shown when DLQ has items) ── */}
        {kpis.dlq_depth > 0 && (
          <motion.div className="lshed-banner" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <Zap size={18} />
            <div>
              <strong>Load-shedding resilience active:</strong> {kpis.dlq_depth} message{kpis.dlq_depth > 1 ? "s" : ""} in the dead-letter queue.
              The system buffered these offline events and will process them on restoration.
              Redrive from the DLQ console when ready — no data was lost.
            </div>
          </motion.div>
        )}

        {/* ── Controller brief ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto",
            gap: 18, alignItems: "center", marginBottom: 20,
            padding: "18px 24px", borderRadius: 20,
            border: "1px solid rgb(31 201 168 / 0.2)",
            background: "linear-gradient(105deg, rgb(31 201 168 / 0.09), rgba(255,255,255,.01) 65%)",
          }}>
          <span style={{
            width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
            border: "1px solid rgb(31 201 168 / 0.4)", background: "radial-gradient(circle at 35% 30%, #12493f, #0a1513)",
            boxShadow: "0 0 20px var(--glow)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 15h3.5l3-8 4.5 12 3-7H21" stroke="#9ff5e4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Controller's brief</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: "var(--ink)" }}
              dangerouslySetInnerHTML={{ __html: briefText.replace(/(\b\d+\b)/g, "<b>$1</b>") }} />
          </div>
          <button className="btn sm" onClick={async () => {
            try { await navigator.clipboard.writeText(briefText); setAction("Brief copied."); }
            catch { setAction("Select the brief text and copy manually."); }
          }}>Copy</button>
        </motion.div>

        {/* ── Main grid ── */}
        <div className="grid">

          {/* ── Corridor hero ── */}
          <Card className="hero" delay={0.08}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="card-title">N3 corridor — Durban port to Gauteng DC</div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>
                  Each rectangle is a shipment. Click to select. Pulsing = overdue or at risk.
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--faint)" }}>~605 km · ~1720 m peak elevation</div>
            </div>
            <CorridorMap shipments={shipments} selected={selected} filter={filter} speed={data.speed} onSelect={handleSelect} />
            <div className="filter-bar">
              {FILTERS.map((f) => {
                const isAll   = f === "ALL";
                const count   = isAll ? total : (st[f as ShipmentState] ?? 0);
                const col     = isAll ? "var(--muted)" : F_COLOR[f as ShipmentState];
                return (
                  <button key={f} className="filter-btn" aria-pressed={filter === f}
                    onClick={() => setFilter(f)}>                    {!isAll && <span className="f-dot" style={{ background: col, color: col }} />}
                    {isAll ? "All" : STATE_NAME[f as ShipmentState]}
                    <span className="count" style={{ color: col }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── KPIs ── */}
          <KpiCard label="Exactly-once storage" value={kpis.duplicates_24h} sub={`duplicate events blocked · ${kpis.events_stored} total stored`} variant="feature" delay={0.14} icon={<Layers size={13} />} />
          <KpiCard label="Open exceptions" value={exc} sub="ops and customer service notified" variant={exc > 0 ? "exc" : "default"} delay={0.18} icon={<AlertTriangle size={13} />} />
          <KpiCard label="Median time in exception" value={kpis.median_minutes_open == null ? "—" : `${kpis.median_minutes_open} min`} sub="until the late update arrived" delay={0.22} icon={<Clock size={13} />} />
          <KpiCard label="Dead-letter queue" value={kpis.dlq_depth} sub={kpis.dlq_depth ? "inspect, fix, then redrive" : "nothing stuck"} variant={kpis.dlq_depth > 0 ? "dlq" : "default"} delay={0.26} icon={<Zap size={13} />} />

          {/* ── Shipment list ── */}
          <Card className="list-card" delay={0.30}>
            <div className="list-head">
              <div>
                <h2>Shipments</h2>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{shown.length} of {total}</span>
              </div>
            </div>
            <div className="scroll-box">
              <table>
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Last update</th>
                    <th>Next due</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0
                    ? <tr><td colSpan={4} className="empty">No shipments match.</td></tr>
                    : shown.map((s) => (
                      <tr key={s.shipment_id} className={s.shipment_id === selected ? "selected" : ""}
                        tabIndex={0} onClick={() => handleSelect(s.shipment_id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSelect(s.shipment_id)}>
                        <td className="id-cell">{s.shipment_id}</td>
                        <td className="muted">{SHORT[s.latest]}</td>
                        <td className="muted mono">{s.next_expected_at ? hhmm(s.next_expected_at) : "—"}</td>
                        <td><span className={`state-pill ${s.state}`}>{STATE_NAME[s.state]}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Shipment detail / timeline ── */}
          <Card className="detail-card" delay={0.34} style={{ padding: 24 }}>
            <div ref={detailRef} className="card-title" style={{ marginBottom: 14 }}>Shipment timeline</div>
            {selectedShipment
              ? <ShipmentTimeline shipment={selectedShipment} exceptions={exceptions} speed={data.speed} />
              : <p style={{ color: "var(--muted)", fontSize: 14 }}>Select a shipment to see its timeline.</p>}
          </Card>

          {/* ── Exception feed ── */}
          <Card className="feed-card" delay={0.38}>
            <div className="list-head" style={{ paddingBottom: 10 }}>
              <h2>Exception feed</h2>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>raised by the sweeper · closes on late arrival</span>
            </div>
            <div className="feed-grid">
              {exceptions.length === 0
                ? <p className="empty">No exceptions. A quiet day.</p>
                : exceptions.map((e) => {
                  const open  = e.status === "OPEN";
                  const mins  = open ? null : Math.round((Date.parse(e.closed_at!) - Date.parse(e.opened_at)) / MIN);
                  return (
                    <div key={e.exception_id} className="feed-item" onClick={() => handleSelect(e.shipment_id)}>
                      <div className="feed-top">
                        <b>{e.shipment_id}</b>
                        <span className={`state-pill ${open ? e.level : "COMPLETE"}`} style={{ fontSize: 11.5 }}>
                          {open ? STATE_NAME[e.level] : "Closed"}
                        </span>
                      </div>
                      <p>
                        {NICE[e.milestone]} {open
                          ? `overdue — raised ${relMin(e.opened_at)}`
                          : `arrived late; closed after ${mins} min`}
                      </p>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* ── SLA tracker ── */}
          <SlaTracker shipments={shipments} speed={data.speed} />

        </div>

        {/* ── Footer ── */}
        <footer>
          <span style={{ color: "var(--faint)", fontSize: 12 }}>
            {live ? "" : "Sample data · add config.js with your API details to connect live"}
          </span>
          <span>Reference implementation · API Gateway, SQS, Lambda, DynamoDB, Cognito · built by Khwezi Maphumulo</span>
        </footer>
      </div>

      {/* ── Overlays ── */}
      <CommandPalette open={pal} onClose={() => setPal(false)} />
      <Toast />
    </>
  );
}
