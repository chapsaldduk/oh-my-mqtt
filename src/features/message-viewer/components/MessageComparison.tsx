import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  payloadToText,
  payloadToJson,
  formatBytes,
} from "@/lib/payload-parser.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { X } from "lucide-react";
import type { MqttMessage } from "@/types/mqtt.ts";

interface Props {
  message1: MqttMessage | null;
  message2: MqttMessage | null;
  onClose: () => void;
}

type DiffType = "equal" | "added" | "removed";

interface DiffLine {
  type: DiffType;
  lineNum1?: number;
  lineNum2?: number;
  text: string;
}

/** A row in the side-by-side view */
interface SideBySideRow {
  leftNum?: number;
  leftText?: string;
  leftType: DiffType | "empty";
  rightNum?: number;
  rightText?: string;
  rightType: DiffType | "empty";
}

type CompareFormat = "json" | "text";

/** LCS-based line diff */
function computeDiff(text1: string, text2: string): DiffLine[] {
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  const m = lines1.length;
  const n = lines2.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const stack: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      stack.push({ type: "equal", lineNum1: i, lineNum2: j, text: lines1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", lineNum2: j, text: lines2[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", lineNum1: i, text: lines1[i - 1] });
      i--;
    }
  }

  return stack.reverse();
}

/** Convert unified diff lines to side-by-side rows, pairing removed+added */
function toSideBySide(diffLines: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let i = 0;

  while (i < diffLines.length) {
    const line = diffLines[i];

    if (line.type === "equal") {
      rows.push({
        leftNum: line.lineNum1,
        leftText: line.text,
        leftType: "equal",
        rightNum: line.lineNum2,
        rightText: line.text,
        rightType: "equal",
      });
      i++;
    } else if (line.type === "removed") {
      // Collect consecutive removed lines
      const removedBlock: DiffLine[] = [];
      while (i < diffLines.length && diffLines[i].type === "removed") {
        removedBlock.push(diffLines[i]);
        i++;
      }
      // Collect consecutive added lines that follow
      const addedBlock: DiffLine[] = [];
      while (i < diffLines.length && diffLines[i].type === "added") {
        addedBlock.push(diffLines[i]);
        i++;
      }
      // Pair them up
      const maxLen = Math.max(removedBlock.length, addedBlock.length);
      for (let k = 0; k < maxLen; k++) {
        const rm = removedBlock[k];
        const ad = addedBlock[k];
        rows.push({
          leftNum: rm?.lineNum1,
          leftText: rm?.text,
          leftType: rm ? "removed" : "empty",
          rightNum: ad?.lineNum2,
          rightText: ad?.text,
          rightType: ad ? "added" : "empty",
        });
      }
    } else {
      // Standalone added (no preceding removed)
      rows.push({
        leftType: "empty",
        rightNum: line.lineNum2,
        rightText: line.text,
        rightType: "added",
      });
      i++;
    }
  }

  return rows;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour12: false,
    fractionalSecondDigits: 3,
  });
}

function formatPayloadByMode(payload: Uint8Array, format: CompareFormat): string {
  return format === "json" ? payloadToJson(payload) : payloadToText(payload);
}

const BG: Record<DiffType | "empty", string> = {
  removed: "bg-red-500/15",
  added: "bg-green-500/15",
  equal: "",
  empty: "bg-[var(--accent)]/30",
};

const TEXT_COLOR: Record<DiffType | "empty", string> = {
  removed: "text-red-700 dark:text-red-300",
  added: "text-green-700 dark:text-green-300",
  equal: "text-[var(--foreground)]",
  empty: "",
};

export function MessageComparison({ message1, message2, onClose }: Props) {
  const [format, setFormat] = useState<CompareFormat>("json");
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const payload1 = useMemo(
    () => (message1 ? formatPayloadByMode(message1.payload, format) : ""),
    [message1, format],
  );
  const payload2 = useMemo(
    () => (message2 ? formatPayloadByMode(message2.payload, format) : ""),
    [message2, format],
  );

  const diffLines = useMemo(() => computeDiff(payload1, payload2), [payload1, payload2]);
  const rows = useMemo(() => toSideBySide(diffLines), [diffLines]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === "added") added++;
      if (line.type === "removed") removed++;
    }
    return { added, removed, identical: added === 0 && removed === 0 };
  }, [diffLines]);

  // Sync scroll between left and right panels
  const handleScroll = useCallback((source: "left" | "right") => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === "left" ? leftRef.current : rightRef.current;
    const to = source === "left" ? rightRef.current : leftRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
    }
    syncing.current = false;
  }, []);

  if (!message1 && !message2) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--foreground)]">Compare</span>
        <div className="flex-1" />
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value as CompareFormat)}
          className="h-6 text-xs w-20"
        >
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          title="Close comparison"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Side labels */}
      <div className="grid grid-cols-2 border-b border-[var(--border)]">
        <div className="px-3 py-1 text-xs font-semibold border-r border-[var(--border)] bg-red-500/5">
          <span className="text-red-600 dark:text-red-400">Message 1</span>
          {message1 && (
            <span className="ml-2 font-mono text-[var(--muted-foreground)] font-normal">
              {message1.topic.length > 25
                ? "…" + message1.topic.slice(-25)
                : message1.topic}{" "}
              {formatTime(message1.timestamp)}
            </span>
          )}
        </div>
        <div className="px-3 py-1 text-xs font-semibold bg-green-500/5">
          <span className="text-green-600 dark:text-green-400">Message 2</span>
          {message2 && (
            <span className="ml-2 font-mono text-[var(--muted-foreground)] font-normal">
              {message2.topic.length > 25
                ? "…" + message2.topic.slice(-25)
                : message2.topic}{" "}
              {formatTime(message2.timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 min-h-0 grid grid-cols-2">
        {stats.identical ? (
          <div className="col-span-2 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
            Payloads are identical
          </div>
        ) : (
          <>
            {/* Left panel */}
            <div
              ref={leftRef}
              className="overflow-auto border-r border-[var(--border)]"
              onScroll={() => handleScroll("left")}
            >
              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={BG[row.leftType]}>
                      <td className="px-1.5 py-0 text-right select-none opacity-40 w-8 border-r border-[var(--border)]">
                        {row.leftNum ?? ""}
                      </td>
                      <td
                        className={`px-2 py-0 whitespace-pre-wrap break-all select-text ${TEXT_COLOR[row.leftType]}`}
                      >
                        {row.leftType === "empty"
                          ? "\u00A0"
                          : row.leftText || "\u00A0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right panel */}
            <div
              ref={rightRef}
              className="overflow-auto"
              onScroll={() => handleScroll("right")}
            >
              <table className="w-full text-xs font-mono border-collapse">
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={BG[row.rightType]}>
                      <td className="px-1.5 py-0 text-right select-none opacity-40 w-8 border-r border-[var(--border)]">
                        {row.rightNum ?? ""}
                      </td>
                      <td
                        className={`px-2 py-0 whitespace-pre-wrap break-all select-text ${TEXT_COLOR[row.rightType]}`}
                      >
                        {row.rightType === "empty"
                          ? "\u00A0"
                          : row.rightText || "\u00A0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-3 py-1 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
        {message1 && message2 && (
          <>
            <span>
              Size: {formatBytes(message1.size)} → {formatBytes(message2.size)}
            </span>
            <span className="text-red-500">−{stats.removed}</span>
            <span className="text-green-500">+{stats.added}</span>
          </>
        )}
      </div>
    </div>
  );
}
