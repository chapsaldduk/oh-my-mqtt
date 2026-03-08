import type { TopicNode, MqttMessage } from '@/types/mqtt.ts';

export function createRootNode(): TopicNode {
  return {
    name: '',
    fullTopic: '',
    children: new Map(),
    messageCount: 0,
    lastMessage: null,
    lastUpdated: 0,
  };
}

export function insertIntoTree(root: TopicNode, message: MqttMessage): void {
  const parts = message.topic.split('/');
  let current = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!current.children.has(part)) {
      current.children.set(part, {
        name: part,
        fullTopic: parts.slice(0, i + 1).join('/'),
        children: new Map(),
        messageCount: 0,
        lastMessage: null,
        lastUpdated: 0,
      });
    }
    current = current.children.get(part)!;
  }

  current.messageCount++;
  current.lastMessage = message;
  current.lastUpdated = message.timestamp;
}

export function getTopicList(root: TopicNode): string[] {
  const topics: string[] = [];

  function walk(node: TopicNode) {
    if (node.fullTopic && node.messageCount > 0) {
      topics.push(node.fullTopic);
    }
    for (const child of node.children.values()) {
      walk(child);
    }
  }

  walk(root);
  return topics.sort();
}

export function getNodeByTopic(
  root: TopicNode,
  topic: string,
): TopicNode | null {
  const parts = topic.split('/');
  let current = root;

  for (const part of parts) {
    const child = current.children.get(part);
    if (!child) return null;
    current = child;
  }

  return current;
}
