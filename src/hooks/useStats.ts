import { useMemo } from 'react';
import { useActiveTabState } from '@/hooks/useMessages.ts';
import type { TopicNode } from '@/types/mqtt.ts';

interface TopicStat {
  topic: string;
  messageCount: number;
  lastMessage: number;
}

export function useStats() {
  const { messages, topicTree, messageRate } = useActiveTabState();

  const stats = useMemo(() => {
    const topicCounts = new Map<string, { count: number; lastTimestamp: number }>();
    for (const m of messages) {
      const existing = topicCounts.get(m.topic);
      if (existing) {
        existing.count++;
        existing.lastTimestamp = Math.max(existing.lastTimestamp, m.timestamp);
      } else {
        topicCounts.set(m.topic, { count: 1, lastTimestamp: m.timestamp });
      }
    }

    const topTopics: TopicStat[] = Array.from(topicCounts.entries())
      .map(([topic, data]) => ({
        topic,
        messageCount: data.count,
        lastMessage: data.lastTimestamp,
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    const totalSize = messages.reduce((acc, m) => acc + m.size, 0);

    let maxDepth = 0;
    function walkDepth(node: TopicNode, depth: number) {
      if (depth > maxDepth) maxDepth = depth;
      for (const child of node.children.values()) walkDepth(child, depth + 1);
    }
    walkDepth(topicTree, 0);

    const qosDist = [0, 0, 0];
    for (const m of messages) {
      qosDist[m.qos]++;
    }

    const retainedCount = messages.filter((m) => m.retain).length;

    return {
      totalMessages: messages.length,
      uniqueTopics: topicCounts.size,
      messageRate,
      totalSize,
      topTopics,
      maxDepth,
      qosDist,
      retainedCount,
    };
  }, [messages, topicTree, messageRate]);

  return stats;
}
