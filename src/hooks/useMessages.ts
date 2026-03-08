import { useMemo } from "react";
import { useMessageStore, type TabMessageState } from "@/stores/messageStore.ts";
import { useUIStore } from "@/stores/uiStore.ts";
import { payloadToText } from "@/lib/payload-parser.ts";
import { createRootNode } from "@/lib/topic-utils.ts";
import type { MqttMessage } from "@/types/mqtt.ts";

const EMPTY_TAB: TabMessageState = {
  messages: [],
  topicTree: createRootNode(),
  selectedTopic: null,
  maxMessages: 0,
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

export function useActiveTabState(): TabMessageState {
  const activeTabId = useUIStore((s) => s.activeTabId);
  const tabs = useMessageStore((s) => s.tabs);
  if (!activeTabId) return EMPTY_TAB;
  return tabs.get(activeTabId) ?? EMPTY_TAB;
}

export function useFilteredMessages(): MqttMessage[] {
  const {
    messages,
    selectedTopic,
    payloadFilter,
    qosFilter,
    retainedFilter,
    useRegex,
  } = useActiveTabState();

  return useMemo(() => {
    let filtered = messages;

    if (selectedTopic) {
      filtered = filtered.filter(
        (m) =>
          m.topic === selectedTopic || m.topic.startsWith(selectedTopic + "/"),
      );
    }

    filtered = filtered.filter((m) => qosFilter.includes(m.qos));

    if (retainedFilter !== null) {
      filtered = filtered.filter((m) => m.retain === retainedFilter);
    }

    if (payloadFilter) {
      filtered = filtered.filter((m) => {
        const payload = payloadToText(m.payload);
        try {
          if (useRegex) {
            const regex = new RegExp(payloadFilter, "i");
            return regex.test(payload);
          } else {
            return payload.toLowerCase().includes(payloadFilter.toLowerCase());
          }
        } catch {
          return payload.toLowerCase().includes(payloadFilter.toLowerCase());
        }
      });
    }

    return filtered;
  }, [
    messages,
    selectedTopic,
    payloadFilter,
    qosFilter,
    retainedFilter,
    useRegex,
  ]);
}

export function useMessageControls() {
  const { isPaused, autoScroll } = useActiveTabState();
  const { togglePause, toggleAutoScroll, clearMessages, setMaxMessages } =
    useMessageStore();
  const { maxMessages } = useActiveTabState();

  return {
    isPaused,
    autoScroll,
    togglePause,
    toggleAutoScroll,
    clearMessages,
    maxMessages,
    setMaxMessages,
  };
}

export function useTopicTree() {
  const { topicTree, selectedTopic, messages, messageRate } =
    useActiveTabState();
  const { selectTopic } = useMessageStore();

  const topicCount = useMemo(() => {
    let count = 0;
    function walk(node: {
      messageCount: number;
      children: Map<string, unknown>;
    }) {
      if (node.messageCount > 0) count++;
      for (const child of (node.children as Map<string, typeof node>).values())
        walk(child);
    }
    walk(topicTree);
    return count;
  }, [topicTree]);

  return {
    topicTree,
    selectedTopic,
    selectTopic,
    totalMessages: messages.length,
    messageRate,
    topicCount,
  };
}
