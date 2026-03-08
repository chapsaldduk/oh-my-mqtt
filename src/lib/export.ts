import type { MqttMessage } from '@/types/mqtt.ts';
import { payloadToText } from './payload-parser.ts';

export function messagesToJson(messages: MqttMessage[]): string {
  const data = messages.map((m) => ({
    topic: m.topic,
    payload: payloadToText(m.payload),
    qos: m.qos,
    retain: m.retain,
    timestamp: new Date(m.timestamp).toISOString(),
    size: m.size,
  }));
  return JSON.stringify(data, null, 2);
}

export function messagesToCsv(messages: MqttMessage[]): string {
  const header = 'timestamp,topic,payload,qos,retain,size';
  const rows = messages.map((m) => {
    const payload = payloadToText(m.payload).replace(/"/g, '""');
    return `${new Date(m.timestamp).toISOString()},${m.topic},"${payload}",${m.qos},${m.retain},${m.size}`;
  });
  return [header, ...rows].join('\n');
}

export async function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  if (window.electronAPI) {
    const ext = filename.split('.').pop() || 'txt';
    await window.electronAPI.file.save(content, filename, [
      { name: `${ext.toUpperCase()} Files`, extensions: [ext] },
    ]);
  } else {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
