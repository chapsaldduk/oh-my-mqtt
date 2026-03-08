import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useFilteredMessages,
  useMessageControls,
} from "@/hooks/useMessages.ts";
import { payloadToText } from "@/lib/payload-parser.ts";
import { cn } from "@/lib/cn.ts";
import { getQosColor } from "@/lib/color-coding.ts";
import type { MqttMessage } from "@/types/mqtt.ts";

interface Props {
  onSelectMessage: (msg: MqttMessage) => void;
  selectedMessageId: string | null;
}

const SCROLL_THRESHOLD = 100; // pixels from bottom to trigger auto-scroll

export function VirtualMessageList({
  onSelectMessage,
  selectedMessageId,
}: Props) {
  const { autoScroll } = useMessageControls();
  const filteredMessages = useFilteredMessages();
  const parentRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const virtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const scrollTop = scrollElement.scrollTop;
      const scrollHeight = scrollElement.scrollHeight;
      const clientHeight = scrollElement.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // If user scrolls up more than threshold, disable auto-scroll
      // If user scrolls back to bottom, enable auto-scroll
      setShouldAutoScroll(distanceFromBottom < SCROLL_THRESHOLD);
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && shouldAutoScroll && filteredMessages.length > 0) {
      virtualizer.scrollToIndex(filteredMessages.length - 1, { align: "end" });
    }
  }, [filteredMessages.length, autoScroll, shouldAutoScroll, virtualizer]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr_1fr_60px] gap-2 px-3 py-1.5 border-b border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)]">
        <span>#</span>
        <span>Topic</span>
        <span>Payload</span>
        <span className="text-right">Time</span>
      </div>

      {/* Virtual list */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const msg = filteredMessages[virtualRow.index];
            const isSelected = msg.id === selectedMessageId;
            const preview = payloadToText(msg.payload).slice(0, 100);
            const time = new Date(msg.timestamp);
            const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}`;

            return (
              <div
                key={msg.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full grid grid-cols-[60px_1fr_1fr_60px] gap-2 px-3 py-1 text-xs font-mono cursor-pointer",
                  "hover:brightness-95 dark:hover:brightness-125 transition-all border-b border-[var(--border)]/30",
                  getQosColor(msg.qos as 0 | 1 | 2),
                  isSelected && "ring-2 ring-[var(--primary)] ring-inset",
                  msg.retain && "border-l-2 border-l-[var(--warning)]",
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onSelectMessage(msg)}
              >
                <span className="text-[var(--muted-foreground)] tabular-nums">
                  {virtualRow.index + 1}
                </span>
                <span className="truncate text-[var(--primary)]">
                  {msg.topic}
                </span>
                <span className="truncate text-[var(--muted-foreground)]">
                  {preview}
                </span>
                <span className="text-right text-[var(--muted-foreground)] tabular-nums">
                  {timeStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {filteredMessages.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
          No messages
        </div>
      )}
    </div>
  );
}
