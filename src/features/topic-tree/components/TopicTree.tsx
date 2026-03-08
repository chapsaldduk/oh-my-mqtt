import { useState } from 'react';
import { useTopicTree } from '@/hooks/useMessages.ts';
import { ChevronRight, ChevronDown, Hash } from 'lucide-react';
import { cn } from '@/lib/cn.ts';
import type { TopicNode as TopicNodeType } from '@/types/mqtt.ts';

export function TopicTree() {
  const { topicTree, selectedTopic, selectTopic, totalMessages, messageRate, topicCount } =
    useTopicTree();

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Topics
        </h2>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {topicTree.children.size === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--muted-foreground)] text-center">
            No messages yet.
            <br />
            Connect to a broker to start.
          </p>
        ) : (
          <div>
            <button
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
}: {
  node: TopicNodeType;
  depth: number;
  selectedTopic: string | null;
  onSelect: (topic: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.size > 0;
  const isSelected = selectedTopic === node.fullTopic;

  return (
    <div>
      <button
        className={cn(
          'flex items-center gap-1 w-full text-left text-xs rounded py-1 px-1 hover:bg-[var(--accent)] transition-colors cursor-pointer',
          isSelected && 'bg-[var(--accent)] font-medium',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
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
          />
        ))}
    </div>
  );
}
