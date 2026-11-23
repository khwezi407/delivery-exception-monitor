import { useEffect, useRef, useState } from "react";
import {
  TOWNS, KM_DEPOT, KM_DC,
  elevationAt, truckKm,
  STATE_COLOR, SHORT, STATE_NAME, MIN,
} from "../../data/corridor";
import type { Shipment } from "../../types";

interface Props {
  shipments: Shipment[];
  selected: string;
  filter: string;
  speed: number;
  onSelect: (id: string) => void;
}
export function CorridorMap({ shipments, selected, filter, speed, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 320 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const w = e[0]?.contentRect.width ?? 900;
      setSize({ w: Math.max(300, w), h: Math.max(200, Math.round(w * 0.32)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const x0 = 28, x1 = W - 28, floor = H - 54, top = 60;
  const X  = (km: number) => x0 + ((x1 - x0) * km) / KM_DC;
  const Y  = (el: number) => floor - (el / 1800) * (floor - top);
  const now = Date.now();

  // Build the elevation path
  const pts = Array.from({ length: 121 }, (_, i) => {
    const km = (KM_DC * i) / 120;
    return [X(km), Y(elevationAt(km))] as [number, number];
  });
  const linePath = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");

  // Town markers (non-hub)
  const small = W < 650;
  const townMarkers = TOWNS.filter((t) => !t[3]).map(([km, , name], i) => {
    const cx = X(km), cy = Y(elevationAt(km));
    return `
      <line x1="${cx}" x2="${cx}" y1="${cy + 4}" y2="${floor}" stroke="rgba(255,255,255,.05)"/>
      <circle cx="${cx}" cy="${cy}" r="2.5" fill="#8fa0a8"/>
      ${small ? "" : `<text x="${cx}" y="${floor - 8 - (i % 2) * 14}" text-anchor="middle" font-size="10.5" fill="#566470">${name}</text>`}
    `;
  }).join("");

  // Hub labels
  const hubLabel = (km: number, name: string, anchor: string, dy: number) => {
    const cx = X(km), cy = Y(elevationAt(km));
    return `
      <circle cx="${cx}" cy="${cy}" r="13" fill="rgba(31,201,168,.10)"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="${dy > 0 ? "#1fc9a8" : "#0d1f1c"}" stroke="rgba(31,201,168,.8)" stroke-width="2"/>
      <text x="${anchor === "start" ? cx - 2 : cx + 2}" y="${floor + dy}" text-anchor="${anchor}" font-size="${small ? 11 : 13}" font-weight="600" fill="#eef3f4">${name}</text>
    `;
  };
  const hubs = hubLabel(0, "Durban port", "start", 20) + hubLabel(KM_DEPOT, "City Deep", "end", 20) + hubLabel(KM_DC, "Gauteng DC", "end", 36);

  // Truck positions
  const laneMap: Record<string, number> = {};
  const positions: Record<string, { cx: number; cy: number }> = {};

  const trucks = shipments.map((s) => {
    const km   = truckKm(s, now, speed);
    const hubMap = { BOOKED: "d", ARRIVED_DEPOT: "cd", ARRIVED_DC: "gdc", DELIVERED: "gdc" } as Partial<Record<typeof s.latest, string>>;
    const hub  = hubMap[s.latest];
    const key  = hub ?? String(Math.round(X(km) / 20));
    const n    = (laneMap[key] = (laneMap[key] ?? 0) + 1) - 1;
    let cx = X(km), cy = Y(elevationAt(km)) - 14 - n * 12;
    if (hub) {
      const col = n % 3, row = Math.floor(n / 3);
      const base = hub === "gdc" ? X(km) - 32 : hub === "d" ? X(km) + 2 : X(km) - 16;
      cx = base + col * 16;
      cy = Y(elevationAt(km)) - 15 - row * 12;
    }
    positions[s.shipment_id] = { cx, cy };
    const late  = s.state === "EXCEPTION" || s.state === "AT_RISK";
    const sel   = s.shipment_id === selected;
    const dim   = filter !== "ALL" && s.state !== filter;
    const col   = STATE_COLOR[s.state];
    return `<g class="truck-node" data-id="${s.shipment_id}" style="cursor:pointer;opacity:${dim ? 0.14 : 1}">
      <title>${s.shipment_id}: ${STATE_NAME[s.state]}, ${SHORT[s.latest]}</title>
      ${late && !dim ? `<circle class="truck-ping" cx="${cx}" cy="${cy}" r="6" fill="${col}"/>` : ""}
      <rect x="${cx - (sel ? 10 : 7)}" y="${cy - (sel ? 5 : 4)}"
        width="${sel ? 20 : 14}" height="${sel ? 10 : 8}" rx="4"
        fill="${col}" stroke="${sel ? "#fff" : "none"}" stroke-width="${sel ? 1.5 : 0}"
        style="filter:drop-shadow(0 0 5px ${col})"/>
    </g>`;
  }).join("");

  // Exception callout tags (up to 2)
  const excTags = shipments
    .filter((s) => s.state === "EXCEPTION")
    .slice(0, 2)
    .map((s, i) => {
      const late = Math.round((now - Date.parse(s.next_expected_at!)) / MIN);
      const p = positions[s.shipment_id] ?? { cx: 100, cy: 100 };
      const tx = Math.min(x1 - 160, Math.max(x0, p.cx - 80));
      const ty = Math.max(4, p.cy - 62 - i * 38);
      return `<g class="truck-node" data-id="${s.shipment_id}" style="cursor:pointer">
        <path d="M${p.cx} ${ty + 28}V${p.cy - 10}" stroke="rgba(249,79,94,.5)" stroke-dasharray="2 3"/>
        <rect x="${tx}" y="${ty}" width="160" height="28" rx="14" fill="rgb(40,10,14,.92)" stroke="rgba(249,79,94,.5)"/>
        <text x="${tx + 80}" y="${ty + 18}" text-anchor="middle" font-size="12" font-weight="600" fill="#ffd2d6">${s.shipment_id} · ${late} min late</text>
      </g>`;
    }).join("");

  // Elevation grid lines
  const gridLines = [600, 1200, 1800].map((el) =>
    `<line x1="${x0}" x2="${x1}" y1="${Y(el)}" y2="${Y(el)}" stroke="rgba(255,255,255,.04)" stroke-dasharray="2 6"/>
     ${small ? "" : `<text x="${x0}" y="${Y(el) - 5}" font-size="10" fill="#3a4a52">${el.toLocaleString("en-ZA")} m</text>`}`
  ).join("");

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1fc9a8" stop-opacity=".18"/>
        <stop offset="1" stop-color="#1fc9a8" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="road" x1="0" x2="1">
        <stop offset="0" stop-color="#3b82f6"/>
        <stop offset=".45" stop-color="#1fc9a8"/>
        <stop offset="1" stop-color="#9ff5e4"/>
      </linearGradient>
      <linearGradient id="sea" x1="0" x2="1">
        <stop offset="0" stop-color="#3b82f6" stop-opacity=".3"/>
        <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
      </linearGradient>
      <filter id="gblur"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>

    <rect x="0" y="${floor - 20}" width="${(x1 - x0) * 0.13}" height="20" fill="url(#sea)"/>
    ${gridLines}
    <path d="${linePath} L${x1} ${floor} L${x0} ${floor}Z" fill="url(#land)"/>
    <line x1="${x0}" x2="${x1}" y1="${floor}" y2="${floor}" stroke="rgba(255,255,255,.08)"/>
    ${townMarkers}
    <path d="${linePath}" stroke="url(#road)" stroke-width="10" fill="none" opacity=".25" filter="url(#gblur)"/>
    <path d="${linePath}" stroke="url(#road)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path class="flow-line" d="${linePath}" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>
    ${hubs}
    ${trucks}
    ${excTags}
  </svg>`;

  return (
    <div ref={wrapRef} className="corridor-fig"
      dangerouslySetInnerHTML={{ __html: svg }}
      onClick={(e) => {
        const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id");
        if (id) onSelect(id);
      }}
    />
  );
}
