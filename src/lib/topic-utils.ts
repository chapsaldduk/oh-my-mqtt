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

/** MQTT topic filter match. `+` = one level, trailing `#` = any remaining levels. */
export function matchTopicFilter(topic: string, filter: string): boolean {
  const t = topic.split('/');
  const f = filter.split('/');

  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }

  return t.length === f.length;
}

function isValidTopicFilter(filter: string): boolean {
  const parts = filter.split('/');
  return parts.every(
    (p, i) => p === '+' || (p === '#' && i === parts.length - 1) || !/[+#]/.test(p),
  );
}

/** Returns null for an invalid regex or topic filter. */
export function createTopicMatcher(
  query: string,
  isRegex: boolean,
): ((topic: string) => boolean) | null {
  if (isRegex) {
    try {
      const regex = new RegExp(query, 'i');
      return (topic) => regex.test(topic);
    } catch {
      return null;
    }
  }

  if (/[+#]/.test(query)) {
    // Trailing '/' is a level still being typed.
    const filter = query.endsWith('/') ? query.slice(0, -1) : query;
    if (!isValidTopicFilter(filter)) return null;
    return (topic) => matchTopicFilter(topic, filter);
  }

  const q = query.toLowerCase();
  return (topic) => topic.toLowerCase().includes(q);
}

/** Keeps matching nodes with their whole subtree, plus their ancestors. */
export function filterTopicTree(
  root: TopicNode,
  match: (topic: string) => boolean,
): TopicNode {
  const walk = (node: TopicNode): TopicNode | null => {
    if (node.fullTopic && match(node.fullTopic)) return node;
    const children = new Map<string, TopicNode>();
    for (const [key, child] of node.children) {
      const kept = walk(child);
      if (kept) children.set(key, kept);
    }
    if (children.size === 0) return null;
    return { ...node, children };
  };

  return walk(root) ?? { ...root, children: new Map() };
}
