import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PayloadFormat } from "@/types/mqtt.ts";

interface UIState {
  theme: "light" | "dark" | "system";
  payloadFormat: PayloadFormat;
  showTimestamp: boolean;
  showQos: boolean;
  showConnectionDialog: boolean;
  showRecorderPanel: boolean;
  showPublisherPanel: boolean;
  showSearchPanel: boolean;
  showStatsPanel: boolean;

  // Multi-tab state (not persisted)
  activeTabId: string | null;
  openTabs: string[];

  setTheme: (theme: "light" | "dark" | "system") => void;
  setPayloadFormat: (format: PayloadFormat) => void;
  toggleConnectionDialog: () => void;
  openConnectionDialog: () => void;
  toggleRecorderPanel: () => void;
  togglePublisherPanel: () => void;
  toggleSearchPanel: () => void;
  toggleStatsPanel: () => void;

  // Tab actions
  setActiveTab: (id: string) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
}

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", isDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      payloadFormat: "json",
      showTimestamp: true,
      showQos: true,
      showConnectionDialog: true,
      showRecorderPanel: false,
      showPublisherPanel: false,
      showSearchPanel: false,
      showStatsPanel: false,

      activeTabId: null,
      openTabs: [],

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setPayloadFormat: (format) => set({ payloadFormat: format }),

      toggleConnectionDialog: () =>
        set((s) => ({ showConnectionDialog: !s.showConnectionDialog })),
      openConnectionDialog: () => set({ showConnectionDialog: true }),
      toggleRecorderPanel: () =>
        set((s) => ({ showRecorderPanel: !s.showRecorderPanel })),
      togglePublisherPanel: () =>
        set((s) => ({ showPublisherPanel: !s.showPublisherPanel })),
      toggleSearchPanel: () =>
        set((s) => ({ showSearchPanel: !s.showSearchPanel })),
      toggleStatsPanel: () =>
        set((s) => ({ showStatsPanel: !s.showStatsPanel })),

      setActiveTab: (id) => set({ activeTabId: id }),

      openTab: (id) =>
        set((s) => {
          if (s.openTabs.includes(id)) {
            return { activeTabId: id };
          }
          return { openTabs: [...s.openTabs, id], activeTabId: id };
        }),

      closeTab: (id) =>
        set((s) => {
          const newTabs = s.openTabs.filter((t) => t !== id);
          const newActive =
            s.activeTabId === id
              ? newTabs[newTabs.length - 1] ?? null
              : s.activeTabId;
          return { openTabs: newTabs, activeTabId: newActive };
        }),
    }),
    {
      name: "oh-my-mqtt-ui",
      partialize: (state) => ({
        theme: state.theme,
        payloadFormat: state.payloadFormat,
        showTimestamp: state.showTimestamp,
        showQos: state.showQos,
        openTabs: state.openTabs,
      }),
    },
  ),
);

// Apply theme on load
const savedTheme =
  JSON.parse(localStorage.getItem("oh-my-mqtt-ui") ?? "{}")?.state?.theme ??
  "dark";
applyTheme(savedTheme);
