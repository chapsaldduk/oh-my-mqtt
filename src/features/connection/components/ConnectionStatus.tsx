import { useConnection } from '@/hooks/useConnection.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Plug, PlugZap, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function ConnectionStatus() {
  const { status, error, activeProfile, reconnectAttempt, disconnect } =
    useConnection();
  const { toggleConnectionDialog } = useUIStore();

  const statusColor = {
    disconnected: 'text-[var(--muted-foreground)]',
    connecting: 'text-[var(--warning)]',
    connected: 'text-[var(--success)]',
    reconnecting: 'text-[var(--warning)]',
    error: 'text-[var(--destructive)]',
  }[status];

  const StatusIcon = {
    disconnected: Plug,
    connecting: Loader2,
    connected: PlugZap,
    reconnecting: RefreshCw,
    error: AlertCircle,
  }[status];

  const statusLabel = {
    disconnected: 'Connect',
    connecting: 'Connecting...',
    connected: activeProfile?.name || 'Connected',
    reconnecting: `Reconnecting (#${reconnectAttempt})...`,
    error: error ?? 'Error',
  }[status];

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (status === 'connected' || status === 'reconnecting') {
            disconnect();
          } else {
            toggleConnectionDialog();
          }
        }}
        className={statusColor}
        title={error ?? status}
      >
        <StatusIcon
          size={14}
          className={status === 'connecting' || status === 'reconnecting' ? 'animate-spin' : ''}
        />
        <span className="ml-1.5 text-xs max-w-[150px] truncate">
          {statusLabel}
        </span>
      </Button>
    </div>
  );
}
