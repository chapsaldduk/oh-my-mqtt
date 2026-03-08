import { useMemo, useState, useCallback } from 'react';
import { useActiveTabState } from '@/hooks/useMessages.ts';
import { payloadToText } from '@/lib/payload-parser.ts';
import type { MqttMessage } from '@/types/mqtt.ts';
import type { SearchFilter } from '@/types/search.ts';

const DEFAULT_FILTER: SearchFilter = {
  query: '',
  target: 'all',
  isRegex: false,
};

export function useSearch() {
  const { messages } = useActiveTabState();
  const [filter, setFilter] = useState<SearchFilter>(DEFAULT_FILTER);
  const [regexError, setRegexError] = useState<string | null>(null);

  const updateFilter = useCallback((updates: Partial<SearchFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
    if (updates.isRegex === false || updates.query !== undefined) {
      setRegexError(null);
    }
  }, []);

  const results: MqttMessage[] = useMemo(() => {
    const { query, target, isRegex, topicPattern, timeRange } = filter;
    if (!query || query.length < 2) return [];

    let matcher: (text: string) => boolean;
    if (isRegex) {
      try {
        const regex = new RegExp(query, 'i');
        matcher = (text) => regex.test(text);
        setRegexError(null);
      } catch {
        setRegexError('Invalid regex pattern');
        return [];
      }
    } else {
      const q = query.toLowerCase();
      matcher = (text) => text.toLowerCase().includes(q);
    }

    return messages
      .filter((m) => {
        if (timeRange) {
          if (m.timestamp < timeRange.from || m.timestamp > timeRange.to) return false;
        }

        if (topicPattern) {
          if (!matchTopicPattern(m.topic, topicPattern)) return false;
        }

        switch (target) {
          case 'topic':
            return matcher(m.topic);
          case 'payload':
            return matcher(payloadToText(m.payload));
          default:
            return matcher(m.topic) || matcher(payloadToText(m.payload));
        }
      })
      .slice(-200);
  }, [messages, filter]);

  return {
    filter,
    updateFilter,
    query: filter.query,
    setQuery: (q: string) => updateFilter({ query: q }),
    results,
    hasResults: results.length > 0,
    resultCount: results.length,
    regexError,
  };
}

function matchTopicPattern(topic: string, pattern: string): boolean {
  const topicParts = topic.split('/');
  const patternParts = pattern.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '#') return true;
    if (patternParts[i] === '+') continue;
    if (i >= topicParts.length) return false;
    if (patternParts[i] !== topicParts[i]) return false;
  }

  return topicParts.length === patternParts.length;
}
