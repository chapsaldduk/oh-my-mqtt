import { payloadToHexDump } from "@/lib/payload-parser.ts";
import { copyToClipboard } from "@/lib/export.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import type { MqttMessage } from "@/types/mqtt.ts";

interface Props {
  message: MqttMessage;
}

export function HexViewer({ message }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bytesPerRow, setBytesPerRow] = useState(16);
  const hexContainerRef = useRef<HTMLDivElement>(null);

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      const container = hexContainerRef.current;
      if (container) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(container);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const hexDump = payloadToHexDump(message.payload, bytesPerRow);

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)]">
        <label className="text-xs text-[var(--muted-foreground)]">
          Bytes per row:
        </label>
        <select
          value={bytesPerRow}
          onChange={(e) => setBytesPerRow(Number(e.target.value))}
          className="h-7 px-2 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
        >
          <option value={8}>8</option>
          <option value={16}>16</option>
          <option value={32}>32</option>
        </select>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleCopy(hexDump, "hexdump")}
          title="Copy all"
        >
          {copiedField === "hexdump" ? (
            <Check size={12} className="text-[var(--success)]" />
          ) : (
            <Copy size={12} />
          )}
        </Button>
      </div>

      {/* Hex Dump */}
      <div
        ref={hexContainerRef}
        className="flex-1 overflow-auto p-3"
        onKeyDown={handleHexKeyDown}
        role="textbox"
        tabIndex={0}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap break-all select-text text-[var(--foreground)]">
          {hexDump}
        </pre>
      </div>
    </div>
  );
}
