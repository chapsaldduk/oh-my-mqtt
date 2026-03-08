import { payloadToText } from "@/lib/payload-parser.ts";
import { formatBytes } from "@/lib/payload-parser.ts";
import { Button } from "@/components/ui/Button.tsx";
import { X } from "lucide-react";
import type { MqttMessage } from "@/types/mqtt.ts";

interface Props {
  message1: MqttMessage | null;
  message2: MqttMessage | null;
  onClose: () => void;
}

function getDiffStyle(char1: string, char2: string): string {
  if (char1 === char2) return "";
  return "bg-red-100/50 dark:bg-red-900/30";
}

function compareStrings(str1: string, str2: string) {
  if (str1 === str2) {
    return [{ text: str1, isDiff: false }];
  }

  // Simple character-by-character comparison
  const result = [];
  const maxLen = Math.max(str1.length, str2.length);

  for (let i = 0; i < maxLen; i++) {
    const c1 = str1[i] || "";
    const c2 = str2[i] || "";

    if (c1 === c2) {
      result.push({ text: c1 || "∅", isDiff: false, isMissing: !c1 || !c2 });
    } else {
      result.push({ text: c1 || "∅", isDiff: true, isMissing: !c1 });
      result.push({ text: c2 || "∅", isDiff: true, isMissing: !c2 });
      result.push({ text: "\n", isDiff: false });
    }
  }

  return result;
}

export function MessageComparison({ message1, message2, onClose }: Props) {
  if (!message1 && !message2) {
    return null;
  }

  const payload1 = message1 ? payloadToText(message1.payload) : "";
  const payload2 = message2 ? payloadToText(message2.payload) : "";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Message Comparison
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          title="Close"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto grid grid-cols-2 gap-2 p-2">
        {/* Message 1 */}
        <div className="flex flex-col border border-[var(--border)] rounded overflow-hidden">
          <div className="bg-[var(--accent)] px-2 py-1 text-xs font-semibold border-b border-[var(--border)]">
            Message 1
            {message1 && (
              <span className="text-[var(--muted-foreground)] text-xs ml-2">
                (
                {new Date(message1.timestamp).toLocaleTimeString("ko-KR", {
                  hour12: false,
                })}
                )
              </span>
            )}
          </div>
          {message1 ? (
            <div className="flex-1 overflow-auto flex flex-col p-2 space-y-2">
              <div className="text-xs space-y-1">
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Topic:</span> {message1.topic}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">QoS:</span> {message1.qos}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Retain:</span>{" "}
                  {message1.retain ? "Yes" : "No"}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Size:</span>{" "}
                  {formatBytes(message1.size)}
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Payload:
                </div>
                <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap break-all select-text max-h-48 overflow-auto">
                  {payload1}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
              No message selected
            </div>
          )}
        </div>

        {/* Message 2 */}
        <div className="flex flex-col border border-[var(--border)] rounded overflow-hidden">
          <div className="bg-[var(--accent)] px-2 py-1 text-xs font-semibold border-b border-[var(--border)]">
            Message 2
            {message2 && (
              <span className="text-[var(--muted-foreground)] text-xs ml-2">
                (
                {new Date(message2.timestamp).toLocaleTimeString("ko-KR", {
                  hour12: false,
                })}
                )
              </span>
            )}
          </div>
          {message2 ? (
            <div className="flex-1 overflow-auto flex flex-col p-2 space-y-2">
              <div className="text-xs space-y-1">
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Topic:</span> {message2.topic}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">QoS:</span> {message2.qos}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Retain:</span>{" "}
                  {message2.retain ? "Yes" : "No"}
                </div>
                <div className="text-[var(--muted-foreground)]">
                  <span className="font-semibold">Size:</span>{" "}
                  {formatBytes(message2.size)}
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Payload:
                </div>
                <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap break-all select-text max-h-48 overflow-auto">
                  {payload2}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
              No message selected
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {message1 && message2 && (
        <div className="px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold">Payload diff:</span>{" "}
          {payload1 === payload2
            ? "Identical"
            : `${Math.abs(payload1.length - payload2.length)} chars difference`}
        </div>
      )}
    </div>
  );
}
