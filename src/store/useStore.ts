import { create } from "zustand";
import type { Overview, DashboardConfig, ShipmentState } from "../types";
import { buildSample } from "../data/sampleData";
import { getStoredToken, clearToken } from "../lib/auth";

type FilterOption = ShipmentState | "ALL";

interface State {
  config: DashboardConfig | null;
  live: boolean;
  data: Overview | null;
  selected: string;
  filter: FilterOption;
  query: string;
  loading: boolean;
  lastAction: string | null;

  init: () => void;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  select: (id: string) => void;
  setFilter: (f: FilterOption) => void;
  setQuery: (q: string) => void;
  setLastAction: (m: string | null) => void;
}

export const useStore = create<State>((set, get) => ({
  config: null,
  live: false,
  data: null,
  selected: "S007",
  filter: "ALL",
  query: "",
  loading: true,
  lastAction: null,

  init: () => {
    const w = window as unknown as { DASH_CONFIG?: DashboardConfig };
    const config = w.DASH_CONFIG ?? null;
    set({ config, live: !!(config?.apiUrl) });
  },

  load: async () => {
    const { live, config } = get();
    set({ loading: true });
    if (!live) { set({ data: buildSample(), loading: false }); return; }
    if (!config || !getStoredToken()) { set({ loading: false }); return; }
    try {
      const r = await fetch(config.apiUrl + "/overview", {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (r.status === 401) { clearToken(); set({ loading: false }); return; }
      set({ data: await r.json(), loading: false });
    } catch { set({ loading: false }); }
  },

  refresh: async () => {
    const { live } = get();
    if (!live) { set({ data: buildSample() }); get().setLastAction("Sample refreshed."); return; }
    return get().load();
  },

  select:        (selected) => set({ selected }),
  setFilter:     (filter)   => set({ filter }),
  setQuery:      (query)    => set({ query }),
  setLastAction: (lastAction) => set({ lastAction }),
}));
