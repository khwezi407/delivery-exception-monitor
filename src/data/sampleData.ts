import type { Overview, Shipment, ShipmentException } from "../types";
import { MILESTONES, OFFSET_MIN, MIN, iso, computeState } from "./corridor";

/** Deterministic sample data: a believable morning on the Durban–Gauteng corridor.
 *  Three shipments are deliberately late so the demo shows all states. */
export function buildSample(): Overview {
  const now = Date.now();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2_147_483_647) / 2_147_483_647);

  // Three pre-scripted late shipments + 21 randomised ones
  const special: Record<string, { age: number; stop: string }> = {
    S007: { age: 1607, stop: "ARRIVED_DC" },
    S013: { age: 1338, stop: "GATE_OUT" },
    S019: { age: 372, stop: "DEPARTED" },
  };

  const shipments: Shipment[] = [];
  for (let n = 1; n <= 24; n++) {
    const id = "S" + String(n).padStart(3, "0");
    const sp = special[id];
    const booked = now - (sp ? sp.age : 60 + rand() * 1800) * MIN;
    const milestones: Shipment["milestones"] = {};
    for (const k of MILESTONES) {
      if (sp && k === sp.stop) break;
      const planned = booked + (OFFSET_MIN[k] * MIN);
      if (planned > now) break;
      const jitter = k === "BOOKED" ? 0 : (rand() * 15 - 5) * MIN;
      milestones[k] = iso(Math.min(planned + jitter, now));
    }
    const { state, latest, next_milestone, next_expected_at } = computeState(milestones, now);
    shipments.push({ shipment_id: id, milestones, state, latest, next_milestone, next_expected_at });
  }

  const makeEx = (s: string, k: Shipment["next_milestone"], lvl: "AT_RISK" | "EXCEPTION", open: boolean, closedMin = 0): ShipmentException => {
    const sh = shipments.find((x) => x.shipment_id === s)!;
    const due = open ? sh.next_expected_at! : iso(now - 300 * MIN);
    return {
      exception_id: `${s}#${k}`,
      shipment_id: s,
      milestone: k as ShipmentException["milestone"],
      level: lvl,
      status: open ? "OPEN" : "CLOSED",
      expected_at: due,
      opened_at: open ? iso(Date.parse(due) + (lvl === "EXCEPTION" ? (30 + 1) : 1) * MIN) : iso(now - 296 * MIN),
      closed_at: open ? null : iso(now - (296 - closedMin) * MIN),
    };
  };

  const exceptions: ShipmentException[] = [
    makeEx("S007", "ARRIVED_DC", "EXCEPTION", true),
    makeEx("S013", "GATE_OUT", "AT_RISK", true),
    makeEx("S019", "DEPARTED", "AT_RISK", true),
    makeEx("S004", "ARRIVED_DEPOT", "EXCEPTION", false, 11),
    makeEx("S011", "DEPARTED", "AT_RISK", false, 7),
  ];

  const states = {} as Overview["kpis"]["states"];
  shipments.forEach((s) => { states[s.state] = (states[s.state] ?? 0) + 1; });

  return {
    generated_at: iso(now),
    speed: 1,
    shipments,
    exceptions,
    kpis: {
      states,
      open_exceptions: 3,
      events_stored: shipments.reduce((a, s) => a + Object.keys(s.milestones).length, 0),
      duplicates_24h: 47,
      dlq_depth: 1,
      median_minutes_open: 9,
    },
  };
}
