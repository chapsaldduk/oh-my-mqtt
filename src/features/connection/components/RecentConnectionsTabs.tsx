import { useConnectionStore } from "@/stores/connectionStore.ts";
import { useUIStore } from "@/stores/uiStore.ts";
import { useMessageStore } from "@/stores/messageStore.ts";
import { Button } from "@/components/ui/Button.tsx";
import { X, Plus } from "lucide-react";

export function RecentConnectionsTabs() {
  const { profiles, connections, disconnect } = useConnectionStore();
  const { openTabs, activeTabId, setActiveTab, openConnectionDialog } =
    useUIStore();
  const tabs = useMessageStore((s) => s.tabs);

  const tabProfiles = openTabs
    .map((id) => profiles.find((p) => p.id === id))
    .filter(Boolean);

  if (tabProfiles.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 px-2 py-1 border-b border-[var(--border)] overflow-x-auto">
      {tabProfiles.map((profile) => {
        if (!profile) return null;
        const isActive = profile.id === activeTabId;
        const conn = connections.get(profile.id);
        const status = conn?.status ?? "disconnected";

        const statusColor =
          status === "connected"
            ? "bg-green-500"
            : status === "connecting" || status === "reconnecting"
              ? "bg-yellow-500 animate-pulse"
              : status === "error"
                ? "bg-red-500"
                : "bg-gray-400";

        return (
          <div
            key={profile.id}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded text-xs whitespace-nowrap
              cursor-pointer transition-colors
              ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent)]/80"
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
            <button
              onClick={() => setActiveTab(profile.id)}
              className="flex-1 hover:underline text-left"
              title={`${profile.name || profile.host}:${profile.port}`}
            >
              {profile.name || profile.host}
            </button>
            {!isActive && (() => {
              const msgCount = tabs.get(profile.id)?.messages.length ?? 0;
              return msgCount > 0 ? (
                <span className="min-w-[18px] h-4 px-1 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-medium flex items-center justify-center">
                  {msgCount > 999 ? "999+" : msgCount}
                </span>
              ) : null;
            })()}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                disconnect(profile.id);
              }}
              title="Close tab (disconnect)"
            >
              <X size={10} />
            </Button>
          </div>
        );
      })}
      <button
        onClick={openConnectionDialog}
        className="flex items-center justify-center w-6 h-6 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors shrink-0"
        title="New connection"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
