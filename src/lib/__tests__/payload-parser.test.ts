import { describe, it, expect } from 'vitest';
import {
  payloadToText,
  payloadToJson,
  payloadToHex,
  payloadToBase64,
  formatPayload,
  isJsonPayload,
  formatBytes,
} from '../payload-parser';

const encode = (str: string) => new TextEncoder().encode(str);

describe('payloadToText', () => {
  it('converts Uint8Array to string', () => {
    expect(payloadToText(encode('hello'))).toBe('hello');
  });

  it('handles empty payload', () => {
    expect(payloadToText(new Uint8Array(0))).toBe('');
  });

  it('handles unicode', () => {
    expect(payloadToText(encode('한글 테스트'))).toBe('한글 테스트');
  });
});

describe('payloadToJson', () => {
  it('pretty-prints valid JSON', () => {
    const json = '{"temp":22.5}';
    const result = payloadToJson(encode(json));
    expect(result).toBe('{\n  "temp": 22.5\n}');
  });

  it('returns raw text for invalid JSON', () => {
    expect(payloadToJson(encode('not json'))).toBe('not json');
  });

  it('handles JSON arrays', () => {
    const result = payloadToJson(encode('[1,2,3]'));
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });
});

describe('payloadToHex', () => {
  it('converts bytes to hex string', () => {
    expect(payloadToHex(new Uint8Array([0, 255, 128]))).toBe('00 ff 80');
  });

  it('handles empty', () => {
    expect(payloadToHex(new Uint8Array(0))).toBe('');
  });
});

describe('payloadToBase64', () => {
  it('converts to base64', () => {
    expect(payloadToBase64(encode('hello'))).toBe('aGVsbG8=');
  });
});

describe('formatPayload', () => {
  it('routes to correct formatter', () => {
    const payload = encode('{"a":1}');
    expect(formatPayload(payload, 'json')).toContain('"a": 1');
    expect(formatPayload(payload, 'text')).toBe('{"a":1}');
    expect(formatPayload(payload, 'hex')).toMatch(/^[0-9a-f ]+$/);
    expect(formatPayload(payload, 'base64')).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('isJsonPayload', () => {
  it('detects JSON objects', () => {
    expect(isJsonPayload(encode('{"key":"value"}'))).toBe(true);
  });

  it('detects JSON arrays', () => {
    expect(isJsonPayload(encode('[1,2,3]'))).toBe(true);
  });

  it('rejects plain text', () => {
    expect(isJsonPayload(encode('hello world'))).toBe(false);
  });

  it('handles whitespace', () => {
    expect(isJsonPayload(encode('  {"a": 1}  '))).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(100)).toBe('100 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats with decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
