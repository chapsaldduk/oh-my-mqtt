import { create } from "zustand";
import type { MqttMessage, TopicNode } from "@/types/mqtt.ts";
import { createRootNode, insertIntoTree } from "@/lib/topic-utils.ts";
import {
  MAX_MESSAGES,
  MESSAGE_BATCH_INTERVAL_MS,
} from "@/constants/defaults.ts";
import { useUIStore } from "./uiStore.ts";

export interface TabMessageState {
  messages: MqttMessage[];
  topicTree: TopicNode;
  selectedTopic: string | null;
  maxMessages: number;
  isPaused: boolean;
  autoScroll: boolean;
  messageRate: number;
  selectedMessage: MqttMessage | null;

  // Filters
  payloadFilter: string;
  qosFilter: (0 | 1 | 2)[];
  retainedFilter: boolean | null;
  useRegex: boolean;

  // Message comparison
  compareIds: [string | null, string | null];
}

function createDefaultTabState(): TabMessageState {
  return {
    messages: [],
    topicTree: createRootNode(),
    selectedTopic: null,
    maxMessages: MAX_MESSAGES,
    isPaused: false,
    autoScroll: true,
    messageRate: 0,
    selectedMessage: null,
    payloadFilter: "",
    qosFilter: [0, 1, 2],
    retainedFilter: null,
    useRegex: false,
    compareIds: [null, null],
  };
}

interface MessageStoreState {
  tabs: Map<string, TabMessageState>;

  // Tab lifecycle
  initTab: (connectionId: string) => void;
  destroyTab: (connectionId: string) => void;

  // Message actions (connectionId-targeted)
  addMessage: (connectionId: string, msg: MqttMessage) => void;

  // Active-tab actions (resolve activeTabId internally)
  selectTopic: (topic: string | null) => void;
  clearMessages: () => void;
  togglePause: () => void;
  toggleAutoScroll: () => void;
  setMaxMessages: (max: number) => void;
  setSelectedMessage: (msg: MqttMessage | null) => void;

  // Filter actions
  setPayloadFilter: (filter: string) => void;
  setQosFilter: (qos: (0 | 1 | 2)[]) => void;
  setRetainedFilter: (retained: boolean | null) => void;
  setUseRegex: (use: boolean) => void;
  clearFilters: () => void;

  // Comparison actions
  setCompareMessage: (slot: 0 | 1, messageId: string | null) => void;
  clearComparison: () => void;
}

// Per-tab batching state
const messageQueues = new Map<string, MqttMessage[]>();
const batchTimers = new Map<string, ReturnType<typeof setTimeout>>();
const rateCounters = new Map<string, number>();
const rateTimers = new Map<string, ReturnType<typeof setInterval>>();

function getActiveTabId(): string | null {
  return useUIStore.getState().activeTabId;
}

function updateTab(
  set: (fn: (state: MessageStoreState) => Partial<MessageStoreState>) => void,
  tabId: string,
  updater: (tab: TabMessageState) => Partial<TabMessageState>,
) {
  set((state) => {
    const tab = state.tabs.get(tabId);
    if (!tab) return {};
    const updated = { ...tab, ...updater(tab) };
    const newTabs = new Map(state.tabs);
    newTabs.set(tabId, updated);
    return { tabs: newTabs };
  });
}

export const useMessageStore = create<MessageStoreState>((set, get) => ({
  tabs: new Map(),

  initTab: (connectionId) => {
    set((state) => {
      if (state.tabs.has(connectionId)) return {};
      const newTabs = new Map(state.tabs);
      newTabs.set(connectionId, createDefaultTabState());
      return { tabs: newTabs };
    });

    // Start rate counter for this tab
    if (!rateTimers.has(connectionId)) {
      rateTimers.set(
        connectionId,
        setInterval(() => {
          const rate = rateCounters.get(connectionId) ?? 0;
          rateCounters.set(connectionId, 0);
          updateTab(set, connectionId, () => ({ messageRate: rate }));
        }, 1000),
      );
    }
  },

  destroyTab: (connectionId) => {
    // Clean up batching state
    const timer = batchTimers.get(connectionId);
    if (timer) clearTimeout(timer);
    batchTimers.delete(connectionId);
    messageQueues.delete(connectionId);
    rateCounters.delete(connectionId);

    const rateTimer = rateTimers.get(connectionId);
    if (rateTimer) clearInterval(rateTimer);
    rateTimers.delete(connectionId);

    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(connectionId);
      return { tabs: newTabs };
    });
  },

  addMessage: (connectionId, msg) => {
    const tab = get().tabs.get(connectionId);
    if (!tab || tab.isPaused) return;

    rateCounters.set(connectionId, (rateCounters.get(connectionId) ?? 0) + 1);

    let queue = messageQueues.get(connectionId);
    if (!queue) {
      queue = [];
      messageQueues.set(connectionId, queue);
    }
    queue.push(msg);

    if (!batchTimers.has(connectionId)) {
      batchTimers.set(
        connectionId,
        setTimeout(() => {
          const batch = messageQueues.get(connectionId) ?? [];
          messageQueues.set(connectionId, []);
          batchTimers.delete(connectionId);

          updateTab(set, connectionId, (tab) => {
            const newTree = tab.topicTree;
            for (const m of batch) {
              insertIntoTree(newTree, m);
            }

            let newMessages = [...tab.messages, ...batch];
            if (newMessages.length > tab.maxMessages) {
              newMessages = newMessages.slice(
                newMessages.length - tab.maxMessages,
              );
            }

            return {
              messages: newMessages,
              topicTree: { ...newTree },
            };
          });
        }, MESSAGE_BATCH_INTERVAL_MS),
      );
    }
  },

  selectTopic: (topic) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ selectedTopic: topic }));
  },

  clearMessages: () => {
    const tabId = getActiveTabId();
    if (!tabId) return;

    // Clear batch queue and timer
    messageQueues.set(tabId, []);
    const timer = batchTimers.get(tabId);
    if (timer) clearTimeout(timer);
    batchTimers.delete(tabId);
    rateCounters.set(tabId, 0);

    updateTab(set, tabId, () => ({
      messages: [],
      topicTree: createRootNode(),
      selectedTopic: null,
      isPaused: false,
      autoScroll: true,
      messageRate: 0,
      selectedMessage: null,
    }));
  },

  togglePause: () => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, (t) => ({ isPaused: !t.isPaused }));
  },

  toggleAutoScroll: () => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, (t) => ({ autoScroll: !t.autoScroll }));
  },

  setMaxMessages: (max) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ maxMessages: max }));
  },

  setSelectedMessage: (msg) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ selectedMessage: msg }));
  },

  setPayloadFilter: (filter) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ payloadFilter: filter }));
  },

  setQosFilter: (qos) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ qosFilter: qos }));
  },

  setRetainedFilter: (retained) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ retainedFilter: retained }));
  },

  setUseRegex: (use) => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ useRegex: use }));
  },

  clearFilters: () => {
    const tabId = getActiveTabId();
    if (tabId)
      updateTab(set, tabId, () => ({
        payloadFilter: "",
        qosFilter: [0, 1, 2],
        retainedFilter: null,
        useRegex: false,
      }));
  },

  setCompareMessage: (slot, messageId) => {
    const tabId = getActiveTabId();
    if (!tabId) return;
    updateTab(set, tabId, (t) => {
      const newCompareIds = [...t.compareIds] as [string | null, string | null];
      newCompareIds[slot] = messageId;
      return { compareIds: newCompareIds };
    });
  },

  clearComparison: () => {
    const tabId = getActiveTabId();
    if (tabId) updateTab(set, tabId, () => ({ compareIds: [null, null] }));
  },
}));
