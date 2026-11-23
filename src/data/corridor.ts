import type { Milestone, Milestones, ShipmentState } from "../types";

export const MILESTONES: Milestone[] = [
  "BOOKED","DEPARTED","ARRIVED_DEPOT","GATE_OUT","ARRIVED_DC","DELIVERED",
];
export const OFFSET_MIN: Record<Milestone, number> = {
  BOOKED: 0, DEPARTED: 360, ARRIVED_DEPOT: 1080,
  GATE_OUT: 1320, ARRIVED_DC: 1560, DELIVERED: 1680,
};
export const NICE: Record<Milestone, string> = {
  BOOKED: "Booked at Durban port", DEPARTED: "Departed Durban port",
  ARRIVED_DEPOT: "Arrived City Deep", GATE_OUT: "Left City Deep",
  ARRIVED_DC: "Arrived Gauteng DC",
  DELIVERED: "Delivered",
};
export const SHORT: Record<Milestone, string> = {
  BOOKED: "Booked", DEPARTED: "On the N3", ARRIVED_DEPOT: "City Deep",
  GATE_OUT: "Left City Deep", ARRIVED_DC: "Gauteng DC", DELIVERED: "Delivered",
};
export const STATE_NAME: Record<ShipmentState, string> = {
  ON_TIME: "On time", AT_RISK: "At risk", EXCEPTION: "Exception", COMPLETE: "Delivered",
};
export const STATE_COLOR: Record<ShipmentState, string> = {
  ON_TIME: "#1fc9a8", AT_RISK: "#f5a623", EXCEPTION: "#f94f5e", COMPLETE: "#5a6670",
};
export const STATE_RANK: Record<ShipmentState, number> = {
  EXCEPTION: 0, AT_RISK: 1, ON_TIME: 2, COMPLETE: 3,
};
export const GRACE_MIN = 30;
export const MIN = 60_000;
export const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19) + "Z";

export function computeState(m: Milestones, now: number, speed = 1): {
  state: ShipmentState; latest: Milestone;
  next_milestone: Milestone | null; next_expected_at: string | null;
} {
  if (m.DELIVERED) return { state: "COMPLETE", latest: "DELIVERED", next_milestone: null, next_expected_at: null };
  const reached = MILESTONES.filter((k) => m[k]);
  const latest = reached[reached.length - 1];
  const start = m.BOOKED
    ? Date.parse(m.BOOKED)
    : Math.min(...reached.map((k) => Date.parse(m[k]!) - (OFFSET_MIN[k] * MIN) / speed));
  const next = MILESTONES[MILESTONES.indexOf(latest) + 1];
  const due = start + (OFFSET_MIN[next] * MIN) / speed;
  return {
    state: now <= due ? "ON_TIME" : now <= due + GRACE_MIN * MIN ? "AT_RISK" : "EXCEPTION",
    latest, next_milestone: next, next_expected_at: iso(due),
  };
}

// N3 elevation profile [km, elevation_m, name, isHub]
export const TOWNS: [number, number, string, number][] = [
  [0, 5, "Durban port", 1], [80, 650, "Pietermaritzburg", 0],
  [165, 1390, "Mooi River", 0], [200, 1190, "Estcourt", 0],
  [300, 1680, "Van Reenan's Pass", 0], [330, 1620, "Harrismith", 0],
  [445, 1530, "Villiers", 0], [525, 1520, "Heidelberg", 0],
  [575, 1720, "City Deep", 1], [605, 1580, "Gauteng DC", 1],
];
export const KM_DEPOT = 575;
export const KM_DC = 605;

export function elevationAt(km: number): number {
  for (let i = 1; i < TOWNS.length; i++) {
    const [k0, e0] = TOWNS[i - 1], [k1, e1] = TOWNS[i];
    if (km <= k1) {
      const t = (km - k0) / (k1 - k0), s = (1 - Math.cos(t * Math.PI)) / 2;
      return e0 + (e1 - e0) * s + Math.sin(km / 9) * 22 * Math.sin(t * Math.PI);
    }
  }
  return TOWNS[TOWNS.length - 1][1];
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function truckKm(s: { milestones: Milestones; latest: Milestone }, now: number, speed = 1): number {
  const m = s.milestones, t = (k: Milestone) => (m[k] ? Date.parse(m[k]!) : 0);
  switch (s.latest) {
    case "BOOKED": return 0;
    case "DEPARTED": return KM_DEPOT * clamp((now - t("DEPARTED")) / (720 * MIN / speed), 0.02, 0.97);
    case "ARRIVED_DEPOT": return KM_DEPOT;
    case "GATE_OUT": return KM_DEPOT + (KM_DC - KM_DEPOT) * clamp((now - t("GATE_OUT")) / (240 * MIN / speed), 0.1, 0.9);
    default: return KM_DC;
  }
}
