import type { PayloadFormat } from './mqtt.ts';

export interface SearchFilter {
  query: string;
  target: 'topic' | 'payload' | 'all';
  isRegex: boolean;
  topicPattern?: string;
  timeRange?: {
    from: number;
    to: number;
  };
  payloadFormat?: PayloadFormat;
}
