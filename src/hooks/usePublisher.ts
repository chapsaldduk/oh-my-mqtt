import { useConnectionStore } from '@/stores/connectionStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { publishMessage } from '@/lib/mqtt-client.ts';

export function usePublisher() {
  const activeTabId = useUIStore((s) => s.activeTabId);
  const connections = useConnectionStore((s) => s.connections);
  const conn = activeTabId ? connections.get(activeTabId) : undefined;
  const isConnected = conn?.status === 'connected';

  const publish = (
    topic: string,
    payload: string,
    options: { qos?: 0 | 1 | 2; retain?: boolean } = {},
  ) => {
    if (!isConnected || !activeTabId) return;
    publishMessage(activeTabId, topic, payload, options);
  };

  return {
    publish,
    isConnected,
  };
}
