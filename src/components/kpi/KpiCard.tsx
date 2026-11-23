import { type ReactNode } from "react";
import { Card } from "../common/Card";

interface Props {
  label: string;
  value: string | number;
  sub: string;
  variant?: "feature" | "exc" | "risk" | "dlq" | "default";
  delay?: number;
  icon?: ReactNode;
}

export function KpiCard({ label, value, sub, variant = "default", delay = 0, icon }: Props) {
  return (
    <Card className={`kpi ${variant !== "default" ? variant : ""}`} delay={delay}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="kpi-sub">
        {icon && <span style={{ marginRight: 5, verticalAlign: "middle" }}>{icon}</span>}
        {sub}
      </div>
    </Card>
  );
}
