import { describe, it, expect } from 'vitest';
import {
  createRootNode,
  insertIntoTree,
  getTopicList,
  getNodeByTopic,
  matchTopicFilter,
  createTopicMatcher,
  filterTopicTree,
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

describe('matchTopicFilter', () => {
  it('matches + as exactly one level', () => {
    expect(matchTopicFilter('lorawan/app1/dev1/up', 'lorawan/+/+/up')).toBe(true);
    expect(matchTopicFilter('lorawan/app1/up', 'lorawan/+/+/up')).toBe(false);
    expect(matchTopicFilter('lorawan/app1/dev1/x/up', 'lorawan/+/+/up')).toBe(false);
  });

  it('matches trailing # as remaining levels including parent', () => {
    expect(matchTopicFilter('sensor', 'sensor/#')).toBe(true);
    expect(matchTopicFilter('sensor/a/b', 'sensor/#')).toBe(true);
    expect(matchTopicFilter('other/a', 'sensor/#')).toBe(false);
  });

  it('requires exact level count without wildcards', () => {
    expect(matchTopicFilter('a/b', 'a/b')).toBe(true);
    expect(matchTopicFilter('a/b/c', 'a/b')).toBe(false);
  });
});

describe('createTopicMatcher', () => {
  it('uses case-insensitive substring without wildcards', () => {
    const match = createTopicMatcher('DEV1', false)!;
    expect(match('lorawan/app1/dev1/up')).toBe(true);
    expect(match('lorawan/app1/dev2/up')).toBe(false);
  });

  it('uses MQTT filter when + or # present', () => {
    const match = createTopicMatcher('lorawan/+/+/up', false)!;
    expect(match('lorawan/app1/dev1/up')).toBe(true);
    expect(match('lorawan/app1/dev1/down')).toBe(false);
  });

  it('ignores trailing slash while typing', () => {
    const match = createTopicMatcher('lorawan/+/', false)!;
    expect(match('lorawan/app1')).toBe(true);
  });

  it('returns null for invalid topic filter', () => {
    expect(createTopicMatcher('lorawan/#/#/up', false)).toBeNull();
    expect(createTopicMatcher('lora+/up', false)).toBeNull();
  });

  it('uses regex in regex mode', () => {
    const match = createTopicMatcher('^lorawan/.+/up$', true)!;
    expect(match('lorawan/app1/dev1/up')).toBe(true);
    expect(match('lorawan/app1/dev1/down')).toBe(false);
  });

  it('returns null for invalid regex', () => {
    expect(createTopicMatcher('[', true)).toBeNull();
  });
});

describe('filterTopicTree', () => {
  function buildTree(topics: string[]) {
    const root = createRootNode();
    for (const t of topics) insertIntoTree(root, makeMsg(t));
    return root;
  }

  it('keeps matching topics and their ancestors', () => {
    const root = buildTree(['lorawan/app1/dev1/up', 'lorawan/app1/dev1/down', 'sensor/temp']);
    const filtered = filterTopicTree(root, (t) => t.endsWith('/up'));
    expect(getTopicList(filtered)).toEqual(['lorawan/app1/dev1/up']);
    expect(filtered.children.has('sensor')).toBe(false);
  });

  it('keeps whole subtree of a matching intermediate node', () => {
    const root = buildTree(['lorawan/app1/dev1/up', 'lorawan/app1/dev1/down', 'sensor/temp']);
    const filtered = filterTopicTree(root, (t) => matchTopicFilter(t, 'lorawan/+'));
    expect(getTopicList(filtered)).toEqual(['lorawan/app1/dev1/down', 'lorawan/app1/dev1/up']);
  });

  it('narrows as more levels are typed', () => {
    const root = buildTree(['lorawan/app1/dev1/up', 'lorawan/app1/dev1/down']);
    const filtered = filterTopicTree(root, (t) => matchTopicFilter(t, 'lorawan/+/+/up'));
    expect(getTopicList(filtered)).toEqual(['lorawan/app1/dev1/up']);
  });

  it('does not mutate the source tree', () => {
    const root = buildTree(['a/b', 'c/d']);
    filterTopicTree(root, (t) => t === 'a/b');
    expect(getTopicList(root)).toEqual(['a/b', 'c/d']);
  });
});
