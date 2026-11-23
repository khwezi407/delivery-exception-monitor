const SA_SHORT = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const SA_LONG  = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const hhmm   = (t?: string | null) => t ? SA_SHORT.format(new Date(t)) : "—";
export const hhmmLg = (t?: string | null) => t ? SA_LONG.format(new Date(t))  : "—";

export const relMin = (t: string) => {
  const m = Math.round((Date.now() - Date.parse(t)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
};

export const lateMin = (expected: string | null) =>
  expected ? Math.max(0, Math.round((Date.now() - Date.parse(expected)) / 60_000)) : 0;

/** Download a text file. */
export function downloadText(filename: string, text: string, type = "text/plain") {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Build CSV from a 2-D array of values. */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
