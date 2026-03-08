import { describe, it, expect } from 'vitest';
import {
  createRootNode,
  insertIntoTree,
  getTopicList,
  getNodeByTopic,
} from '../topic-utils';
import type { MqttMessage } from '@/types/mqtt';

function makeMsg(topic: string): MqttMessage {
  return {
    id: `msg-${Math.random()}`,
    topic,
    payload: new Uint8Array(0),
    qos: 0,
    retain: false,
    timestamp: Date.now(),
    size: 0,
  };
}

describe('createRootNode', () => {
  it('creates empty root', () => {
    const root = createRootNode();
    expect(root.name).toBe('');
    expect(root.fullTopic).toBe('');
    expect(root.children.size).toBe(0);
    expect(root.messageCount).toBe(0);
  });
});

describe('insertIntoTree', () => {
  it('inserts single-level topic', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('temperature'));
    expect(root.children.has('temperature')).toBe(true);
    expect(root.children.get('temperature')!.messageCount).toBe(1);
  });

  it('inserts multi-level topic', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('sensor/temp/room1'));
    expect(root.children.has('sensor')).toBe(true);
    const sensor = root.children.get('sensor')!;
    expect(sensor.children.has('temp')).toBe(true);
    const temp = sensor.children.get('temp')!;
    expect(temp.children.has('room1')).toBe(true);
    expect(temp.children.get('room1')!.messageCount).toBe(1);
  });

  it('increments count for repeated topics', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('sensor/temp'));
    insertIntoTree(root, makeMsg('sensor/temp'));
    insertIntoTree(root, makeMsg('sensor/temp'));
    expect(root.children.get('sensor')!.children.get('temp')!.messageCount).toBe(3);
  });

  it('builds correct fullTopic', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('a/b/c'));
    const a = root.children.get('a')!;
    expect(a.fullTopic).toBe('a');
    expect(a.children.get('b')!.fullTopic).toBe('a/b');
    expect(a.children.get('b')!.children.get('c')!.fullTopic).toBe('a/b/c');
  });
});

describe('getTopicList', () => {
  it('returns empty for empty tree', () => {
    expect(getTopicList(createRootNode())).toEqual([]);
  });

  it('returns sorted topic list', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('z/topic'));
    insertIntoTree(root, makeMsg('a/topic'));
    insertIntoTree(root, makeMsg('m/topic'));
    expect(getTopicList(root)).toEqual(['a/topic', 'm/topic', 'z/topic']);
  });
});

describe('getNodeByTopic', () => {
  it('finds existing node', () => {
    const root = createRootNode();
    insertIntoTree(root, makeMsg('sensor/temp'));
    const node = getNodeByTopic(root, 'sensor/temp');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('temp');
  });

  it('returns null for non-existent topic', () => {
    const root = createRootNode();
    expect(getNodeByTopic(root, 'nonexistent')).toBeNull();
  });
});
