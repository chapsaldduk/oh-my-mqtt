import { useEffect, useRef, useState } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { TopicTree } from "@/features/topic-tree/components/TopicTree.tsx";
import { VirtualMessageList } from "@/features/message-viewer/components/VirtualMessageList.tsx";
import { MessageDetail } from "@/features/message-viewer/components/MessageDetail.tsx";
import { MessageComparison } from "@/features/message-viewer/components/MessageComparison.tsx";
import { MessageToolbar } from "@/features/message-viewer/components/MessageToolbar.tsx";
import { RecentConnectionsTabs } from "@/features/connection/components/RecentConnectionsTabs.tsx";
import { SubscriptionBar } from "@/features/connection/components/SubscriptionBar.tsx";
import { SearchPanel } from "@/features/search/components/SearchPanel.tsx";
import { StatsView } from "@/features/stats/components/StatsView.tsx";
import { useUIStore } from "@/stores/uiStore.ts";
import { useMessageStore } from "@/stores/messageStore.ts";
import { useActiveTabState } from "@/hooks/useMessages.ts";
import type { MqttMessage } from "@/types/mqtt.ts";

const MIN_LEFT_WIDTH = 240;
const MAX_LEFT_RATIO = 0.4;
const COLLAPSED_WIDTH = 0;

export function Layout() {
  const { selectedMessage, compareIds, messages } = useActiveTabState();
  const setSelectedMessage = useMessageStore((s) => s.setSelectedMessage);
  const clearComparison = useMessageStore((s) => s.clearComparison);

  const isComparing = compareIds[0] !== null && compareIds[1] !== null;
  const compareMessage1 = isComparing ? messages.find((m) => m.id === compareIds[0]) ?? null : null;
  const compareMessage2 = isComparing ? messages.find((m) => m.id === compareIds[1]) ?? null : null;
  const { showStatsPanel } = useUIStore();
  const [leftWidth, setLeftWidth] = useState(MIN_LEFT_WIDTH + 20);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const lastExpandedWidthRef = useRef(MIN_LEFT_WIDTH + 20);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (event: PointerEvent) => {
      const containerWidth =
        containerRef.current?.getBoundingClientRect().width ?? 0;
      const maxWidth = containerWidth * MAX_LEFT_RATIO;
      const next = startWidthRef.current + (event.clientX - startXRef.current);
      const clamped = Math.min(
        Math.max(next, MIN_LEFT_WIDTH),
        maxWidth || MIN_LEFT_WIDTH,
      );
      setLeftWidth(clamped);
      lastExpandedWidthRef.current = clamped;
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging]);

  const toggleCollapse = () => {
    if (isCollapsed) {
      setLeftWidth(lastExpandedWidthRef.current);
      setIsCollapsed(false);
    } else {
      lastExpandedWidthRef.current = leftWidth;
      setLeftWidth(COLLAPSED_WIDTH);
      setIsCollapsed(true);
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = leftWidth;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSelectMessage = (msg: MqttMessage) => {
    setSelectedMessage(msg);
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={containerRef} className="flex h-full w-full">
        {/* Left: Topic Tree */}
        <div
          className="shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: isCollapsed ? COLLAPSED_WIDTH : leftWidth,
            minWidth: isCollapsed ? 0 : MIN_LEFT_WIDTH,
          }}
        >
          {!isCollapsed && (showStatsPanel ? <StatsView /> : <TopicTree />)}
        </div>

        {/* Resize handle with toggle button */}
        <div className="relative flex items-center">
          <div
            className="w-1 h-full bg-[var(--border)] hover:bg-[var(--primary)] transition-colors cursor-col-resize"
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleResizeStart}
          />
          <button
            onClick={toggleCollapse}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-8 bg-[var(--background)] border border-[var(--border)] rounded hover:bg-[var(--accent)] transition-colors flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] z-10"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform"
              style={{
                transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path
                d="M7 2L3 6L7 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Right: Messages */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Connection tabs */}
          <RecentConnectionsTabs />
          <SubscriptionBar />

          <Group orientation="vertical" className="flex-1 min-h-0">
            {/* Top: Message List */}
            <Panel defaultSize={60} minSize={30} className="min-h-[200px]">
              <div className="h-full flex flex-col">
                <MessageToolbar />
                <div className="flex-1 min-h-0">
                  <VirtualMessageList
                    onSelectMessage={handleSelectMessage}
                    selectedMessageId={selectedMessage?.id ?? null}
                  />
                </div>
              </div>
            </Panel>

            <Separator className="h-1 bg-[var(--border)] hover:bg-[var(--primary)] transition-colors cursor-row-resize" />

            {/* Bottom: Message Detail or Comparison */}
            <Panel defaultSize={40} minSize={20} className="min-h-[160px]">
              {isComparing ? (
                <MessageComparison
                  message1={compareMessage1}
                  message2={compareMessage2}
                  onClose={clearComparison}
                />
              ) : (
                <MessageDetail message={selectedMessage} />
              )}
            </Panel>
          </Group>
        </div>
      </div>

      {/* Search overlay */}
      <SearchPanel />
    </div>
  );
}
