import { useCallback } from 'react';
import { useConnectionStore } from '@/stores/connectionStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';

export function useConnection() {
  const {
    profiles,
    connections,
    connect,
    disconnect: disconnectById,
    addProfile,
    updateProfile,
    deleteProfile,
    loadProfiles,
    createDefaultProfile,
  } = useConnectionStore();

  const activeTabId = useUIStore((s) => s.activeTabId);
  const conn = activeTabId ? connections.get(activeTabId) : undefined;

  const status = conn?.status ?? 'disconnected';
  const error = conn?.error ?? null;
  const reconnectAttempt = conn?.reconnectAttempt ?? 0;

  const activeProfile = profiles.find((p) => p.id === activeTabId) ?? null;
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'reconnecting';

  const disconnect = useCallback(() => {
    if (activeTabId) disconnectById(activeTabId);
  }, [activeTabId, disconnectById]);

  return {
    profiles,
    activeProfile,
    activeConnectionId: activeTabId,
    status,
    error,
    reconnectAttempt,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    addProfile,
    updateProfile,
    deleteProfile,
    loadProfiles,
    createDefaultProfile,
    connections,
  };
}
