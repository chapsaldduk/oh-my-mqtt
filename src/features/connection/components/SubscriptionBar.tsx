import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useUIStore } from "@/stores/uiStore.ts";
import { useConnectionStore } from "@/stores/connectionStore.ts";
import { subscribeTopic, unsubscribeTopic } from "@/lib/mqtt-client.ts";
import type { Subscription } from "@/types/mqtt.ts";

export function SubscriptionBar() {
  const activeTabId = useUIStore((s) => s.activeTabId);
  const profiles = useConnectionStore((s) => s.profiles);
  const connections = useConnectionStore((s) => s.connections);
  const updateProfile = useConnectionStore((s) => s.updateProfile);

  const [newTopic, setNewTopic] = useState("#");
  const [newQos, setNewQos] = useState<0 | 1 | 2>(0);
  const [expanded, setExpanded] = useState(false);

  if (!activeTabId) return null;

  const profile = profiles.find((p) => p.id === activeTabId);
  const conn = connections.get(activeTabId);
  if (!profile || conn?.status !== "connected") return null;

  const subscriptions = profile.subscriptions ?? [];

  const handleAdd = () => {
    const topic = newTopic.trim();
    if (!topic) return;
    if (subscriptions.some((s) => s.topic === topic)) return;

    const sub: Subscription = { topic, qos: newQos };
    const newSubs = [...subscriptions, sub];
    updateProfile(activeTabId, { subscriptions: newSubs });
    subscribeTopic(activeTabId, sub);
    setNewTopic("");
  };

  const handleRemove = (topic: string) => {
    const newSubs = subscriptions.filter((s) => s.topic !== topic);
    updateProfile(activeTabId, { subscriptions: newSubs });
    unsubscribeTopic(activeTabId, topic);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)]">
      {/* Compact row: add input + subscription tags */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Topic to subscribe..."
          className="h-7 text-xs flex-1 min-w-[120px] max-w-[240px]"
        />
        <Select
          value={newQos}
          onChange={(e) => setNewQos(Number(e.target.value) as 0 | 1 | 2)}
          className="h-7 text-xs w-[72px]"
        >
          <option value={0}>QoS 0</option>
          <option value={1}>QoS 1</option>
          <option value={2}>QoS 2</option>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={handleAdd}
        >
          <Plus size={12} className="mr-0.5" />
          Sub
        </Button>

        <div className="w-px h-5 bg-[var(--border)] mx-1" />

        {/* Subscription tags */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {(expanded ? subscriptions : subscriptions.slice(0, 3)).map((sub) => (
            <span
              key={sub.topic}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--accent)] border border-[var(--border)] whitespace-nowrap shrink-0"
              style={
                sub.color
                  ? {
                      borderColor: sub.color,
                      backgroundColor: `${sub.color}15`,
                    }
                  : undefined
              }
            >
              <span className="max-w-[120px] truncate" title={sub.topic}>
                {sub.topic}
              </span>
              <span className="text-[var(--muted-foreground)]">
                q{sub.qos}
              </span>
              <button
                onClick={() => handleRemove(sub.topic)}
                className="hover:text-[var(--destructive)] transition-colors"
                title={`Unsubscribe ${sub.topic}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {!expanded && subscriptions.length > 3 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] whitespace-nowrap"
            >
              +{subscriptions.length - 3} more
            </button>
          )}
          {expanded && subscriptions.length > 3 && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] whitespace-nowrap"
            >
              less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
