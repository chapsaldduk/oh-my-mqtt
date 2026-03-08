import { useUIStore } from "@/stores/uiStore.ts";
import { useMessageStore } from "@/stores/messageStore.ts";
import { useActiveTabState } from "@/hooks/useMessages.ts";
import {
  formatPayload,
  isJsonPayload,
  formatBytes,
} from "@/lib/payload-parser.ts";
import { copyToClipboard } from "@/lib/export.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Copy, Check, GitCompare } from "lucide-react";
import { useState, useRef } from "react";

import type { MqttMessage, PayloadFormat } from "@/types/mqtt.ts";

interface Props {
  message: MqttMessage | null;
}

export function MessageDetail({ message }: Props) {
  const { payloadFormat, setPayloadFormat } = useUIStore();
  const { compareIds } = useActiveTabState();
  const { setCompareMessage } = useMessageStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const payloadContainerRef = useRef<HTMLDivElement>(null);

  const handlePayloadKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      const container = payloadContainerRef.current;
      if (container) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(container);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  if (!message) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">
        Select a message to view details
      </div>
    );
  }

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  // Hex Viewer has special UI
  if (payloadFormat === "hex") {
    return (
      <div className="h-full flex flex-col">
        {/* Meta */}
        <div className="px-3 py-2 border-b border-[var(--border)] space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">
              Topic:
            </span>
            <code className="text-xs font-mono text-[var(--primary)] flex-1 truncate">
              {message.topic}
            </code>
            <CopyBtn
              text={message.topic}
              field="topic"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span>QoS: {message.qos}</span>
            <span>Retain: {message.retain ? "Yes" : "No"}</span>
            <span>Size: {formatBytes(message.size)}</span>
            <span>
              Time:{" "}
              {new Date(message.timestamp).toLocaleTimeString("ko-KR", {
                hour12: false,
                fractionalSecondDigits: 3,
              })}
            </span>
          </div>
        </div>

        {/* Format selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
          <Select
            value={payloadFormat}
            onChange={(e) => setPayloadFormat(e.target.value as PayloadFormat)}
            className="h-7 text-xs"
          >
            <option value="json">JSON</option>
            <option value="text">Text</option>
            <option value="hex">Hex/ASCII</option>
            <option value="base64">Base64</option>
          </Select>
          <div className="flex-1" />
          <div className="flex gap-1">
            <Button
              variant={compareIds[0] === message.id ? "default" : "outline"}
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                setCompareMessage(
                  0,
                  compareIds[0] === message.id ? null : message.id,
                )
              }
              title="Add to comparison (slot 1)"
            >
              <GitCompare size={12} />
            </Button>
            <Button
              variant={compareIds[1] === message.id ? "default" : "outline"}
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                setCompareMessage(
                  1,
                  compareIds[1] === message.id ? null : message.id,
                )
              }
              title="Add to comparison (slot 2)"
            >
              <GitCompare size={12} />
            </Button>
          </div>
        </div>

        {/* Hex Viewer */}
        <HexViewer message={message} />
      </div>
    );
  }

  const formattedPayload = formatPayload(message.payload, payloadFormat);
  const autoFormat: PayloadFormat = isJsonPayload(message.payload)
    ? "json"
    : "text";

  const time = new Date(message.timestamp);
  const timeStr = time.toLocaleTimeString("ko-KR", {
    hour12: false,
    fractionalSecondDigits: 3,
  });

  return (
    <div className="h-full flex flex-col">
      {/* Meta */}
      <div className="px-3 py-2 border-b border-[var(--border)] space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">Topic:</span>
          <code className="text-xs font-mono text-[var(--primary)] flex-1 truncate">
            {message.topic}
          </code>
          <CopyBtn
            text={message.topic}
            field="topic"
            copiedField={copiedField}
            onCopy={handleCopy}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span>QoS: {message.qos}</span>
          <span>Retain: {message.retain ? "Yes" : "No"}</span>
          <span>Size: {formatBytes(message.size)}</span>
          <span>Time: {timeStr}</span>
        </div>
      </div>

      {/* Payload */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <Select
          value={payloadFormat}
          onChange={(e) => setPayloadFormat(e.target.value as PayloadFormat)}
          className="h-7 text-xs"
        >
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </Select>
        {payloadFormat !== autoFormat && (
          <button
            className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
            onClick={() => setPayloadFormat(autoFormat)}
          >
            Auto ({autoFormat})
          </button>
        )}
        <div className="flex-1" />
        <div className="flex gap-1">
          <Button
            variant={compareIds[0] === message.id ? "default" : "outline"}
            size="icon"
            className="h-6 w-6"
            onClick={() =>
              setCompareMessage(
                0,
                compareIds[0] === message.id ? null : message.id,
              )
            }
            title="Add to comparison (slot 1)"
          >
            <GitCompare size={12} />
          </Button>
          <Button
            variant={compareIds[1] === message.id ? "default" : "outline"}
            size="icon"
            className="h-6 w-6"
            onClick={() =>
              setCompareMessage(
                1,
                compareIds[1] === message.id ? null : message.id,
              )
            }
            title="Add to comparison (slot 2)"
          >
            <GitCompare size={12} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleCopy(formattedPayload, "payload")}
            title="Copy"
          >
            {copiedField === "payload" ? (
              <Check size={12} className="text-[var(--success)]" />
            ) : (
              <Copy size={12} />
            )}
          </Button>
        </div>
      </div>

      <div
        ref={payloadContainerRef}
        className="flex-1 overflow-auto p-3"
        onKeyDown={handlePayloadKeyDown}
        role="textbox"
        tabIndex={0}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap break-all select-text">
          {formattedPayload}
        </pre>
      </div>
    </div>
  );
}

function CopyBtn({
  text,
  field,
  copiedField,
  onCopy,
}: {
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const copied = copiedField === field;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => onCopy(text, field)}
      title="Copy"
    >
      {copied ? (
        <Check size={12} className="text-[var(--success)]" />
      ) : (
        <Copy size={12} />
      )}
    </Button>
  );
}
