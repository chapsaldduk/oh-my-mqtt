import type { PayloadFormat } from "@/types/mqtt.ts";

const textDecoder = new TextDecoder("utf-8", { fatal: false });

export function payloadToText(payload: Uint8Array): string {
  return textDecoder.decode(payload);
}

export function payloadToJson(payload: Uint8Array): string {
  const text = payloadToText(payload);
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

export function payloadToHex(payload: Uint8Array): string {
  return Array.from(payload)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function payloadToBase64(payload: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < payload.length; i++) {
    binary += String.fromCharCode(payload[i]);
  }
  return btoa(binary);
}

export function formatPayload(
  payload: Uint8Array,
  format: PayloadFormat,
): string {
  switch (format) {
    case "json":
      return payloadToJson(payload);
    case "hex":
      return payloadToHex(payload);
    case "base64":
      return payloadToBase64(payload);
    case "text":
    default:
      return payloadToText(payload);
  }
}

export function isJsonPayload(payload: Uint8Array): boolean {
  const text = payloadToText(payload).trim();
  return (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  );
}

export function payloadToHexDump(
  payload: Uint8Array,
  bytesPerRow: number = 16,
): string {
  if (payload.length === 0) return "(empty)";

  const lines: string[] = [];
  for (let i = 0; i < payload.length; i += bytesPerRow) {
    const row = payload.slice(i, Math.min(i + bytesPerRow, payload.length));

    // Offset
    const offset = i.toString(16).padStart(4, "0").toUpperCase();

    // Hex representation
    const hexParts: string[] = [];
    for (let j = 0; j < bytesPerRow; j++) {
      if (j < row.length) {
        hexParts.push(row[j].toString(16).padStart(2, "0").toUpperCase());
      } else {
        hexParts.push("  ");
      }
    }
    const hexStr = hexParts.join(" ");

    // ASCII representation
    const asciiParts: string[] = [];
    for (let j = 0; j < row.length; j++) {
      const byte = row[j];
      // Printable ASCII range: 32-126
      asciiParts.push(
        byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".",
      );
    }
    const asciiStr = asciiParts.join("");

    lines.push(`${offset}: ${hexStr}  | ${asciiStr} |`);
  }

  return lines.join("\n");
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
