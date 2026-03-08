import { useState } from 'react';
import { usePublisher } from '@/hooks/usePublisher.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Dialog } from '@/components/ui/Dialog.tsx';
import { Send } from 'lucide-react';

export function PublisherPanel() {
  const { showPublisherPanel, togglePublisherPanel } = useUIStore();
  const { publish, isConnected } = usePublisher();

  const [topic, setTopic] = useState('');
  const [payload, setPayload] = useState('');
  const [qos, setQos] = useState<0 | 1 | 2>(0);
  const [retain, setRetain] = useState(false);

  const handlePublish = () => {
    if (!topic || !isConnected) return;
    publish(topic, payload, { qos, retain });
  };

  return (
    <Dialog
      open={showPublisherPanel}
      onClose={togglePublisherPanel}
      title="Publish Message"
      className="max-w-md"
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Topic
          </label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="sensor/room1/temperature"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Payload
          </label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"value": 23.5}'
            className="flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm font-mono min-h-[100px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted-foreground)]">QoS</label>
            <Select
              value={qos}
              onChange={(e) => setQos(Number(e.target.value) as 0 | 1 | 2)}
              className="h-8 text-xs w-16"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </Select>
          </div>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={retain}
              onChange={(e) => setRetain(e.target.checked)}
              className="rounded"
            />
            Retain
          </label>
          <div className="flex-1" />
          <Button
            onClick={handlePublish}
            disabled={!topic || !isConnected}
          >
            <Send size={14} className="mr-1.5" />
            Publish
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
