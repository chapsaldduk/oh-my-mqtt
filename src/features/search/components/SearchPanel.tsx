import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch.ts';
import { useTopicTree } from '@/hooks/useMessages.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { payloadToText } from '@/lib/payload-parser.ts';
import { Input } from '@/components/ui/Input.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { X, ToggleLeft, ToggleRight, Clock, Filter } from 'lucide-react';

export function SearchPanel() {
  const { showSearchPanel, toggleSearchPanel } = useUIStore();
  const { selectTopic } = useTopicTree();
  const { filter, updateFilter, results, resultCount, regexError } = useSearch();
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!showSearchPanel) return null;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-[var(--card)] border-l border-[var(--border)] z-20 flex flex-col shadow-lg">
      {/* Search input */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <Input
          value={filter.query}
          onChange={(e) => updateFilter({ query: e.target.value })}
          placeholder={filter.isRegex ? 'Regex pattern...' : 'Search topics & payloads...'}
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateFilter({ isRegex: !filter.isRegex })}
          title={filter.isRegex ? 'Switch to text search' : 'Switch to regex search'}
          className={filter.isRegex ? 'text-[var(--primary)]' : ''}
        >
          {filter.isRegex ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Advanced filters"
          className={showAdvanced ? 'text-[var(--primary)]' : ''}
        >
          <Filter size={14} />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleSearchPanel}>
          <X size={14} />
        </Button>
      </div>

      {/* Status bar */}
      {(filter.isRegex || regexError) && (
        <div className="px-3 py-1 text-[10px] text-[var(--muted-foreground)] border-b border-[var(--border)]/50">
          Regex mode {regexError && <span className="text-[var(--destructive)]">- {regexError}</span>}
        </div>
      )}

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="p-3 border-b border-[var(--border)] space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[var(--muted-foreground)] w-12 shrink-0">Target</label>
            <Select
              value={filter.target}
              onChange={(e) => updateFilter({ target: e.target.value as 'topic' | 'payload' | 'all' })}
              className="h-7 text-xs flex-1"
            >
              <option value="all">All</option>
              <option value="topic">Topic only</option>
              <option value="payload">Payload only</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[var(--muted-foreground)] w-12 shrink-0">Topic</label>
            <Input
              value={filter.topicPattern ?? ''}
              onChange={(e) => updateFilter({ topicPattern: e.target.value || undefined })}
              placeholder="sensor/+/temp or device/#"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[var(--muted-foreground)] shrink-0 ml-0.5" />
            <div className="flex items-center gap-1 flex-1">
              <input
                type="datetime-local"
                className="h-7 text-[10px] px-1 bg-transparent border border-[var(--input)] rounded flex-1"
                onChange={(e) => {
                  const from = e.target.value ? new Date(e.target.value).getTime() : undefined;
                  updateFilter({
                    timeRange: from
                      ? { from, to: filter.timeRange?.to ?? Date.now() }
                      : undefined,
                  });
                }}
              />
              <span className="text-[10px] text-[var(--muted-foreground)]">~</span>
              <input
                type="datetime-local"
                className="h-7 text-[10px] px-1 bg-transparent border border-[var(--input)] rounded flex-1"
                onChange={(e) => {
                  const to = e.target.value ? new Date(e.target.value).getTime() : undefined;
                  if (filter.timeRange && to) {
                    updateFilter({ timeRange: { ...filter.timeRange, to } });
                  }
                }}
              />
            </div>
          </div>
          {(filter.topicPattern || filter.timeRange) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-[10px]"
              onClick={() => updateFilter({ topicPattern: undefined, timeRange: undefined })}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {results.length === 0 && filter.query.length >= 2 && (
          <p className="p-4 text-xs text-[var(--muted-foreground)] text-center">
            No results
          </p>
        )}
        {results.map((m) => (
          <button
            key={m.id}
            className="w-full text-left px-3 py-2 text-xs border-b border-[var(--border)]/30 hover:bg-[var(--accent)] transition-colors cursor-pointer"
            onClick={() => {
              selectTopic(m.topic);
              toggleSearchPanel();
            }}
          >
            <div className="font-mono text-[var(--primary)] truncate">
              {m.topic}
            </div>
            <div className="text-[var(--muted-foreground)] truncate">
              {payloadToText(m.payload).slice(0, 80)}
            </div>
            <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5">
              {new Date(m.timestamp).toLocaleTimeString('ko-KR', { hour12: false, fractionalSecondDigits: 3 })}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      {results.length > 0 && (
        <div className="p-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] text-center">
          {resultCount} results
        </div>
      )}
    </div>
  );
}
