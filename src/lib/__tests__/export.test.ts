import { describe, it, expect } from 'vitest';
import { messagesToJson, messagesToCsv } from '../export';
import type { MqttMessage } from '@/types/mqtt.ts';

function makeMsg(topic: string, payloadStr: string, timestamp = 1700000000000): MqttMessage {
  return {
    id: 'msg-1',
    topic,
    payload: new TextEncoder().encode(payloadStr),
    qos: 1,
    retain: false,
    timestamp,
    size: payloadStr.length,
  };
}

describe('export', () => {
  describe('messagesToJson', () => {
    it('exports messages as JSON', () => {
      const messages = [makeMsg('sensor/temp', '{"value":23}')];
      const result = messagesToJson(messages);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].topic).toBe('sensor/temp');
      expect(parsed[0].payload).toBe('{"value":23}');
      expect(parsed[0].qos).toBe(1);
    });

    it('exports empty array', () => {
      const result = messagesToJson([]);
      expect(JSON.parse(result)).toEqual([]);
    });

    it('includes all fields', () => {
      const messages = [makeMsg('test', 'hello')];
      const parsed = JSON.parse(messagesToJson(messages));
      expect(parsed[0]).toHaveProperty('topic');
      expect(parsed[0]).toHaveProperty('payload');
      expect(parsed[0]).toHaveProperty('qos');
      expect(parsed[0]).toHaveProperty('retain');
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('size');
    });
  });

  describe('messagesToCsv', () => {
    it('exports messages as CSV with header', () => {
      const messages = [makeMsg('sensor/temp', 'hello')];
      const result = messagesToCsv(messages);
      const lines = result.split('\n');
      expect(lines[0]).toBe('timestamp,topic,payload,qos,retain,size');
      expect(lines[1]).toContain('sensor/temp');
      expect(lines[1]).toContain('"hello"');
    });

    it('escapes double quotes in payload', () => {
      const messages = [makeMsg('test', 'say "hello"')];
      const result = messagesToCsv(messages);
      expect(result).toContain('""hello""');
    });

    it('exports empty messages with header only', () => {
      const result = messagesToCsv([]);
      const lines = result.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('timestamp,topic,payload,qos,retain,size');
    });
  });
});
