import { create } from "zustand";

interface UiState {
  paletteOpen: boolean;
  activeFindingKey: string | null;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openFinding: (key: string | null) => void;
}

export const useUi = create<UiState>((set) => ({
  paletteOpen: false,
  activeFindingKey: null,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openFinding: (activeFindingKey) => set({ activeFindingKey }),
}));
