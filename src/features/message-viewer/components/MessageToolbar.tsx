import { useState } from "react";
import {
  useFilteredMessages,
  useMessageControls,
  useActiveTabState,
} from "@/hooks/useMessages.ts";
import { useTopicTree } from "@/hooks/useMessages.ts";
import { useMessageStore } from "@/stores/messageStore.ts";
import { messagesToJson, messagesToCsv, downloadFile } from "@/lib/export.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import {
  Pause,
  Play,
  ArrowDownToLine,
  Trash2,
  Download,
  Filter,
  X,
} from "lucide-react";

export function MessageToolbar() {
  const { isPaused, autoScroll, togglePause, toggleAutoScroll, clearMessages } =
    useMessageControls();
  const { payloadFilter, qosFilter, retainedFilter, useRegex } =
    useActiveTabState();
  const {
    setPayloadFilter,
    setQosFilter,
    setRetainedFilter,
    setUseRegex,
    clearFilters,
  } = useMessageStore();

  useTopicTree();
  const messages = useFilteredMessages();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    payloadFilter || qosFilter.length < 3 || retainedFilter !== null;

  const handleExport = (format: "json" | "csv") => {
    const filtered = messages;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    if (format === "json") {
      downloadFile(
        messagesToJson(filtered),
        `mqtt-${timestamp}.json`,
        "application/json",
      );
    } else {
      downloadFile(
        messagesToCsv(filtered),
        `mqtt-${timestamp}.csv`,
        "text/csv",
      );
    }
  };

  const toggleQos = (qos: 0 | 1 | 2) => {
    const newQos = qosFilter.includes(qos)
      ? qosFilter.filter((q) => q !== qos)
      : [...qosFilter, qos].sort();
    setQosFilter(newQos as (0 | 1 | 2)[]);
  };

  return (
    <div className="flex flex-col border-b border-[var(--border)]">
      <div className="flex items-center gap-1 px-3 py-1.5">
        <Button
          variant={isPaused ? "default" : "ghost"}
          size="icon"
          onClick={togglePause}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </Button>
        <Button
          variant={autoScroll ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleAutoScroll}
          title="Auto-scroll"
        >
          <ArrowDownToLine size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearMessages}
          title="Clear messages"
        >
          <Trash2 size={14} />
        </Button>

        <Button
          variant={hasActiveFilters ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <Filter size={14} />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={() => handleExport("json")}>
          <Download size={12} className="mr-1" />
          JSON
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleExport("csv")}>
          <Download size={12} className="mr-1" />
          CSV
        </Button>
      </div>

      {showFilters && (
        <div className="px-3 py-2 space-y-2 border-t border-[var(--border)] bg-[var(--accent)]/30">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">
              Payload Filter
            </label>
            <div className="flex gap-1">
              <Input
                type="text"
                placeholder={useRegex ? "Regex pattern..." : "Search..."}
                value={payloadFilter}
                onChange={(e) => setPayloadFilter(e.target.value)}
                className="text-xs h-7"
              />
              <Button
                variant={useRegex ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setUseRegex(!useRegex)}
                title="Regex mode"
                className="h-7 w-7 text-xs"
              >
                .*
              </Button>
              {payloadFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPayloadFilter("")}
                  className="h-7 w-7"
                >
                  <X size={12} />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">
              QoS
            </label>
            <div className="flex gap-1">
              {[0, 1, 2].map((qos) => (
                <Button
                  key={qos}
                  variant={
                    qosFilter.includes(qos as 0 | 1 | 2) ? "secondary" : "ghost"
                  }
                  size="sm"
                  onClick={() => toggleQos(qos as 0 | 1 | 2)}
                  className="h-6 px-2 text-xs"
                >
                  {qos}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">
              Retained
            </label>
            <div className="flex gap-1">
              <Button
                variant={retainedFilter === true ? "secondary" : "ghost"}
                size="sm"
                onClick={() =>
                  setRetainedFilter(retainedFilter === true ? null : true)
                }
                className="h-6 px-2 text-xs"
              >
                Retained only
              </Button>
              <Button
                variant={retainedFilter === false ? "secondary" : "ghost"}
                size="sm"
                onClick={() =>
                  setRetainedFilter(retainedFilter === false ? null : false)
                }
                className="h-6 px-2 text-xs"
              >
                Fresh only
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full h-6 text-xs"
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
