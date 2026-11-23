import { Card } from "../common/Card";
import { MILESTONES, NICE, OFFSET_MIN, MIN } from "../../data/corridor";
import type { Shipment } from "../../types";

interface Props { shipments: Shipment[]; speed?: number; }

/** Business feature: for every reached milestone across all shipments, shows
 *  how many were on time, the average variance in minutes, and a mini bar.
 *  Gives an ops manager an at-a-glance SLA health view. */
export function SlaTracker({ shipments, speed = 1 }: Props) {
  type StatRow = { milestone: string; label: string; count: number; onTime: number; avg: number; pct: number };
  const stats: StatRow[] = MILESTONES.filter((m) => m !== "BOOKED").flatMap((milestone) => {
    const rows = shipments.flatMap((s) => {
      const actual = s.milestones[milestone];
      if (!actual) return [];
      const booked = s.milestones.BOOKED;
      const start  = booked
        ? Date.parse(booked)
        : Date.parse(actual) - (OFFSET_MIN[milestone] * MIN) / speed;
      const expected = start + (OFFSET_MIN[milestone] * MIN) / speed;
      const diff     = Math.round((Date.parse(actual) - expected) / MIN);
      return [diff];
    });
    if (rows.length === 0) return [];
    const onTime  = rows.filter((d) => d <= 30).length;
    const avg     = Math.round(rows.reduce((a, b) => a + b, 0) / rows.length);
    const pct     = Math.round((onTime / rows.length) * 100);
    return [{ milestone, label: NICE[milestone], count: rows.length, onTime, avg, pct }];
  });

  if (stats.length === 0) return null;

  return (
    <Card className="sla-card" delay={0.52}>
      <div style={{ padding: "0 24px 24px" }}>
        <div className="card-title" style={{ paddingTop: 20 }}>SLA performance — this batch</div>
        <table>
          <thead>
            <tr>
              <th>Milestone</th>
              <th className="num">Shipments</th>
              <th className="num">On time</th>
              <th className="num">Avg variance</th>
              <th style={{ width: 120 }}>On-time %</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.milestone}>
                <td style={{ fontWeight: 500 }}>{s.label}</td>
                <td className="num">{s.count}</td>
                <td className={`num ${s.pct >= 80 ? "sla-row-ok" : s.pct >= 60 ? "sla-row-risk" : "sla-row-exc"}`}>
                  {s.onTime}
                </td>
                <td className={`num ${s.avg <= 10 ? "sla-row-ok" : s.avg <= 30 ? "sla-row-risk" : "sla-row-exc"}`}>
                  {s.avg > 0 ? `+${s.avg}` : s.avg} min
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="progress-mini" style={{ flex: 1 }}>
                      <i style={{
                        width: `${s.pct}%`,
                        background: s.pct >= 80 ? "var(--ok)" : s.pct >= 60 ? "var(--risk)" : "var(--exc)",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--muted)", width: 34, textAlign: "right" }}>
                      {s.pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
