// The data model for the Delivery Exception Monitor.

export type Milestone =
  | "BOOKED"
  | "DEPARTED"
  | "ARRIVED_DEPOT"
  | "GATE_OUT"
  | "ARRIVED_DC"
  | "DELIVERED";

export type ShipmentState = "ON_TIME" | "AT_RISK" | "EXCEPTION" | "COMPLETE";

export type ExceptionLevel = "AT_RISK" | "EXCEPTION";

/** Milestones keyed by name -> ISO 8601 timestamp reached. */
export type Milestones = Partial<Record<Milestone, string>>;

export interface Shipment {
  shipment_id: string;
  milestones: Milestones;
  state: ShipmentState;
  latest: Milestone;
  next_milestone: Milestone | null;
  next_expected_at: string | null;
}

export interface ShipmentException {
  exception_id: string;
  shipment_id: string;
  milestone: Milestone;
  level: ExceptionLevel;
  status: "OPEN" | "CLOSED";
  expected_at: string;
  opened_at: string;
  closed_at: string | null;
}

export interface TimelineStep {
  milestone: Milestone;
  expected_at: string;
  actual_at: string | null;
}

export interface OverviewKpis {
  states: Partial<Record<ShipmentState, number>>;
  open_exceptions: number;
  events_stored: number;
  duplicates_24h: number;
  dlq_depth: number;
  median_minutes_open: number | null;
}

export interface Overview {
  generated_at: string;
  speed: number;
  shipments: Shipment[];
  exceptions: ShipmentException[];
  kpis: OverviewKpis;
}

export interface DashboardConfig {
  apiUrl: string;
  cognitoDomain: string;
  clientId: string;
  redirectUri: string;
}
