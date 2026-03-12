import { useState, useCallback, useRef, useEffect } from 'react';
import { useTopicTree } from '@/hooks/useMessages.ts';
import { ChevronRight, ChevronDown, Hash } from 'lucide-react';
import { cn } from '@/lib/cn.ts';
import type { TopicNode as TopicNodeType } from '@/types/mqtt.ts';

/** Collect visible topic keys in display order. null = "All Topics". */
function flattenVisible(
  nodes: Map<string, TopicNodeType>,
  expandedSet: Set<string>,
): (string | null)[] {
  const result: (string | null)[] = [null];
  const walk = (children: Map<string, TopicNodeType>) => {
    for (const node of children.values()) {
      result.push(node.fullTopic);
      if (node.children.size > 0 && expandedSet.has(node.fullTopic)) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
}

/** Auto-expand only NEW nodes up to depth 2 (skip already-known topics) */
function autoExpandTree(
  nodes: Map<string, TopicNodeType>,
  existing: Set<string>,
  knownTopics: Set<string>,
): Set<string> {
  const next = new Set(existing);
  const walk = (children: Map<string, TopicNodeType>, depth: number) => {
    if (depth >= 2) return;
    for (const node of children.values()) {
      if (node.children.size > 0 && !knownTopics.has(node.fullTopic)) {
        next.add(node.fullTopic);
      }
      walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return next;
}

/** Collect all topic keys from tree */
function collectAllTopics(nodes: Map<string, TopicNodeType>): Set<string> {
  const result = new Set<string>();
  const walk = (children: Map<string, TopicNodeType>) => {
    for (const node of children.values()) {
      result.add(node.fullTopic);
      walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

/** Find a node by its fullTopic path */
function findNode(
  nodes: Map<string, TopicNodeType>,
  fullTopic: string,
): TopicNodeType | null {
  for (const node of nodes.values()) {
    if (node.fullTopic === fullTopic) return node;
    if (fullTopic.startsWith(node.fullTopic + '/')) {
      const found = findNode(node.children, fullTopic);
      if (found) return found;
    }
  }
  return null;
}

export function TopicTree() {
  const { topicTree, selectedTopic, selectTopic, totalMessages, messageRate, topicCount } =
    useTopicTree();

  const knownTopicsRef = useRef<Set<string>>(new Set());
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() =>
    autoExpandTree(topicTree.children, new Set(), knownTopicsRef.current),
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const activeRef = useRef(false);

  // Auto-expand only NEW nodes when tree updates
  const [prevTree, setPrevTree] = useState(topicTree);
  if (prevTree !== topicTree) {
    setPrevTree(topicTree);
    setExpandedSet((prev) => autoExpandTree(topicTree.children, prev, knownTopicsRef.current));
    knownTopicsRef.current = collectAllTopics(topicTree.children);
  }

  // Track whether topic panel is "active" via clicks anywhere inside it
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const activate = () => { activeRef.current = true; };
    const deactivate = (e: MouseEvent) => {
      if (!panel.contains(e.target as Node)) {
        activeRef.current = false;
      }
    };

    panel.addEventListener('mousedown', activate);
    window.addEventListener('mousedown', deactivate);
    return () => {
      panel.removeEventListener('mousedown', activate);
      window.removeEventListener('mousedown', deactivate);
    };
  }, []);

  // Window-level keydown listener (capture phase) for arrow navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // ArrowRight/Left: expand/collapse current node
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!selectedTopic) return;
        const node = findNode(topicTree.children, selectedTopic);
        if (!node || node.children.size === 0) return;
        const isExpanded = expandedSet.has(selectedTopic);
        if (e.key === 'ArrowRight' && !isExpanded) {
          setExpandedSet((prev) => new Set(prev).add(selectedTopic));
        } else if (e.key === 'ArrowLeft' && isExpanded) {
          setExpandedSet((prev) => {
            const next = new Set(prev);
            next.delete(selectedTopic);
            return next;
          });
        }
        return;
      }

      // ArrowUp/Down: navigate between visible topics
      const visibleTopics = flattenVisible(topicTree.children, expandedSet);
      if (visibleTopics.length === 0) return;

      const currentIdx = visibleTopics.indexOf(selectedTopic);
      let nextIdx: number;
      if (e.key === 'ArrowUp') {
        nextIdx = currentIdx <= 0 ? visibleTopics.length - 1 : currentIdx - 1;
      } else {
        nextIdx = currentIdx >= visibleTopics.length - 1 ? 0 : currentIdx + 1;
      }

      const nextTopic = visibleTopics[nextIdx];
      selectTopic(nextTopic ?? null);

      const key = nextTopic ?? '__all__';
      const btnEl = itemRefs.current.get(key);
      if (btnEl) {
        btnEl.scrollIntoView({ block: 'nearest' });
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [topicTree, expandedSet, selectedTopic, selectTopic]);

  const toggleExpanded = useCallback((fullTopic: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(fullTopic)) next.delete(fullTopic);
      else next.add(fullTopic);
      return next;
    });
  }, []);

  const setItemRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) itemRefs.current.set(key, el);
    else itemRefs.current.delete(key);
  }, []);

  return (
    <div ref={panelRef} className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Topics
        </h2>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-1"
      >
        {topicTree.children.size === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--muted-foreground)] text-center">
            No messages yet.
            <br />
            Connect to a broker to start.
          </p>
        ) : (
          <div>
            <button
              ref={(el) => setItemRef('__all__', el)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 w-full text-left text-xs rounded hover:bg-[var(--accent)] cursor-pointer',
                selectedTopic === null && 'bg-[var(--accent)] font-medium',
              )}
              onClick={() => selectTopic(null)}
            >
              <Hash size={12} />
              <span>All Topics</span>
              <span className="ml-auto text-[var(--muted-foreground)]">
                {totalMessages}
              </span>
            </button>
            {Array.from(topicTree.children.values()).map((node) => (
              <TopicNodeItem
                key={node.name}
                node={node}
                depth={0}
                selectedTopic={selectedTopic}
                onSelect={selectTopic}
                expandedSet={expandedSet}
                onToggleExpand={toggleExpanded}
                setItemRef={setItemRef}
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-0.5">
        <div className="flex justify-between">
          <span>Topics</span>
          <span>{topicCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Messages</span>
          <span>{totalMessages.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Rate</span>
          <span>{messageRate}/s</span>
        </div>
      </div>
    </div>
  );
}

function TopicNodeItem({
  node,
  depth,
  selectedTopic,
  onSelect,
  expandedSet,
  onToggleExpand,
  setItemRef,
}: {
  node: TopicNodeType;
  depth: number;
  selectedTopic: string | null;
  onSelect: (topic: string | null) => void;
  expandedSet: Set<string>;
  onToggleExpand: (fullTopic: string) => void;
  setItemRef: (key: string, el: HTMLButtonElement | null) => void;
}) {
  const hasChildren = node.children.size > 0;
  const isSelected = selectedTopic === node.fullTopic;
  const expanded = expandedSet.has(node.fullTopic);

  return (
    <div>
      <button
        ref={(el) => setItemRef(node.fullTopic, el)}
        className={cn(
          'flex items-center gap-1 w-full text-left text-xs rounded py-1 px-1 hover:bg-[var(--accent)] transition-colors cursor-pointer',
          isSelected && 'bg-[var(--accent)] font-medium',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) onToggleExpand(node.fullTopic);
          onSelect(node.fullTopic);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={12} className="shrink-0 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-[var(--muted-foreground)]" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {hasChildren && (
          <span className="text-[10px] text-[var(--muted-foreground)] opacity-60 shrink-0">
            ({node.children.size})
          </span>
        )}
        {node.messageCount > 0 && (
          <span className="ml-auto text-[var(--muted-foreground)] tabular-nums shrink-0">
            {node.messageCount}
          </span>
        )}
      </button>
      {expanded &&
        hasChildren &&
        Array.from(node.children.values()).map((child) => (
          <TopicNodeItem
            key={child.name}
            node={child}
            depth={depth + 1}
            selectedTopic={selectedTopic}
            onSelect={onSelect}
            expandedSet={expandedSet}
            onToggleExpand={onToggleExpand}
            setItemRef={setItemRef}
          />
        ))}
    </div>
  );
}
