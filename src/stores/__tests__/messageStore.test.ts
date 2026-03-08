import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMessageStore } from '../messageStore';

function makeMsg(topic: string, id?: string) {
  return {
    id: id ?? `msg-${Math.random()}`,
    topic,
    payload: new Uint8Array([1, 2, 3]),
    qos: 0 as const,
    retain: false,
    timestamp: Date.now(),
    size: 3,
  };
}

describe('messageStore', () => {
  beforeEach(() => {
    useMessageStore.getState().clearMessages();
    vi.useFakeTimers();
  });

  it('starts with empty messages', () => {
    expect(useMessageStore.getState().messages).toEqual([]);
  });

  it('adds message after batch interval', () => {
    useMessageStore.getState().addMessage(makeMsg('test/topic'));
    // Messages are batched at 16ms
    vi.advanceTimersByTime(20);
    expect(useMessageStore.getState().messages.length).toBe(1);
  });

  it('batches multiple messages', () => {
    useMessageStore.getState().addMessage(makeMsg('test/a'));
    useMessageStore.getState().addMessage(makeMsg('test/b'));
    useMessageStore.getState().addMessage(makeMsg('test/c'));
    vi.advanceTimersByTime(20);
    expect(useMessageStore.getState().messages.length).toBe(3);
  });

  it('builds topic tree from messages', () => {
    useMessageStore.getState().addMessage(makeMsg('sensor/temp'));
    useMessageStore.getState().addMessage(makeMsg('sensor/humidity'));
    vi.advanceTimersByTime(20);
    const tree = useMessageStore.getState().topicTree;
    expect(tree.children.has('sensor')).toBe(true);
  });

  it('clears messages', () => {
    useMessageStore.getState().addMessage(makeMsg('test'));
    vi.advanceTimersByTime(20);
    useMessageStore.getState().clearMessages();
    expect(useMessageStore.getState().messages.length).toBe(0);
  });

  it('toggles pause', () => {
    expect(useMessageStore.getState().isPaused).toBe(false);
    useMessageStore.getState().togglePause();
    expect(useMessageStore.getState().isPaused).toBe(true);
  });

  it('does not add messages when paused', () => {
    useMessageStore.getState().togglePause();
    useMessageStore.getState().addMessage(makeMsg('test'));
    vi.advanceTimersByTime(20);
    expect(useMessageStore.getState().messages.length).toBe(0);
  });

  it('selects topic', () => {
    useMessageStore.getState().selectTopic('my/topic');
    expect(useMessageStore.getState().selectedTopic).toBe('my/topic');
  });

  it('deselects topic', () => {
    useMessageStore.getState().selectTopic('my/topic');
    useMessageStore.getState().selectTopic(null);
    expect(useMessageStore.getState().selectedTopic).toBeNull();
  });
});
