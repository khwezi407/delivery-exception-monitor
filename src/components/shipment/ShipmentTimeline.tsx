import { MILESTONES, NICE, OFFSET_MIN, MIN, iso } from "../../data/corridor";
import type { Shipment, ShipmentException } from "../../types";
import { hhmm } from "../../lib/helpers";

interface Props {
  shipment: Shipment;
  exceptions: ShipmentException[];
  speed?: number;
}

export function ShipmentTimeline({ shipment: s, exceptions, speed = 1 }: Props) {
  const m       = s.milestones;
  const reached = MILESTONES.filter((k) => m[k]);
  const start   = m.BOOKED
    ? Date.parse(m.BOOKED)
    : Math.min(...reached.map((k) => Date.parse(m[k]!) - (OFFSET_MIN[k] * MIN) / speed));

  const timeline = MILESTONES.map((k) => ({
    milestone: k,
    expected_at: iso(start + (OFFSET_MIN[k] * MIN) / speed),
    actual_at: m[k] ?? null,
  }));

  const done    = timeline.filter((t) => t.actual_at).length;
  const pct     = Math.max(2, Math.round(((done - 1) / (MILESTONES.length - 1)) * 100));
  const openEx  = exceptions.find((e) => e.shipment_id === s.shipment_id && e.status === "OPEN");
  const eta     = timeline[timeline.length - 1].expected_at;
  const GRACE   = 30;

  const stateName  = { ON_TIME: "On time", AT_RISK: "At risk", EXCEPTION: "Exception", COMPLETE: "Delivered" }[s.state];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <span style={{ font: `600 18px "Geist Mono", monospace`, color: "var(--teal2)" }}>{s.shipment_id}</span>
        <span className={`state-pill ${s.state}`}>{stateName}</span>
      </div>

      {/* Progress bar */}
      <div className="prog-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="meta-row">
        <span>{pct}% of the journey</span>
        <span>Planned delivery {hhmm(eta)}</span>
      </div>

      {/* Alert banner */}
      {openEx && (
        <div className={`banner ${openEx.level === "AT_RISK" ? "risk" : ""}`} style={{ marginTop: 12 }}>
          <strong>{NICE[openEx.milestone]}</strong> is overdue. Expected {hhmm(openEx.expected_at)}.
          {openEx.level === "EXCEPTION"
            ? " Operations and customer service have been notified — this closes automatically when the update arrives."
            : " Operations warned early, before customers feel it."}
        </div>
      )}

      {!openEx && s.state === "COMPLETE" && (
        <div className="banner ok" style={{ marginTop: 12 }}>
          ✓ Delivered successfully. All milestones reached.
        </div>
      )}

      {/* Steps */}
      <ol className="steps">
        {timeline.map((t) => {
          const isNext = t.milestone === s.next_milestone;
          const late   = !t.actual_at && isNext && s.state !== "ON_TIME";
          const cls    = t.actual_at ? "done" : late ? (s.state === "EXCEPTION" ? "late" : "risky") : "";
          const diff   = t.actual_at ? Math.round((Date.parse(t.actual_at) - Date.parse(t.expected_at)) / MIN) : null;
          const diffEl = diff == null ? null : Math.abs(diff) < 2
            ? <em className="early">on time</em>
            : diff < 0
              ? <em className="early">{-diff} min early</em>
              : <em className={diff > GRACE ? "very-late" : "late-txt"}>{diff} min late</em>;

          return (
            <li key={t.milestone} className={cls}>
              <div className="mk" />
              <div>
                <b>{NICE[t.milestone]}</b>
                <span>Planned {hhmm(t.expected_at)}</span>
              </div>
              <div className="when-col">
                {t.actual_at
                  ? <>{hhmm(t.actual_at)}{diffEl}</>
                  : late
                    ? <em className={s.state === "EXCEPTION" ? "very-late" : "late-txt"}>overdue</em>
                    : <span style={{ color: "var(--faint)" }}>pending</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
