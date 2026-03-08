import { useState } from 'react';
import { useRecorder } from '@/hooks/useRecorder.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Dialog } from '@/components/ui/Dialog.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { formatBytes } from '@/lib/payload-parser.ts';
import {
  Circle,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
} from 'lucide-react';

function formatDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RecorderPanel() {
  const { showRecorderPanel, toggleRecorderPanel } = useUIStore();
  const {
    isRecording,
    isPlaying,
    isPaused,
    currentSession,
    sessions,
    playbackSpeed,
    playbackPosition,
    playbackDuration,
    startRecording,
    stopRecording,
    deleteSession,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    setPlaybackSpeed,
    seekPlayback,
    exportSession,
  } = useRecorder();

  const [name, setName] = useState('');
  const [topicFilter, setTopicFilter] = useState('');

  const handleStart = () => {
    const sessionName = name || `Recording ${new Date().toLocaleString('ko-KR')}`;
    startRecording(sessionName, topicFilter || undefined);
    setName('');
    setTopicFilter('');
  };

  return (
    <Dialog
      open={showRecorderPanel}
      onClose={toggleRecorderPanel}
      title="Session Recorder"
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Recording controls */}
        {!isRecording ? (
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Session name (optional)"
            />
            <Input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Topic filter, e.g. sensor/# (optional)"
            />
            <Button onClick={handleStart} className="w-full">
              <Circle size={14} className="mr-1.5 fill-current text-red-500" />
              Start Recording
            </Button>
          </div>
        ) : (
          <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              <span>{currentSession?.name}</span>
              <span className="mx-2">|</span>
              <span>{currentSession?.messageCount ?? 0} messages</span>
              <span className="mx-2">|</span>
              <span>{formatBytes(currentSession?.totalSize ?? 0)}</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="w-full"
            >
              <Square size={12} className="mr-1.5" />
              Stop Recording
            </Button>
          </div>
        )}

        {/* Playback controls (shown when playing) */}
        {isPlaying && (
          <div className="p-3 rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Playback</span>
              <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
                {formatDuration(playbackPosition)} / {formatDuration(playbackDuration)}
              </span>
            </div>
            {/* Timeline slider */}
            <input
              type="range"
              min={0}
              max={playbackDuration}
              value={playbackPosition}
              onChange={(e) => seekPlayback(Number(e.target.value))}
              className="w-full h-1.5 accent-[var(--primary)] cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => isPaused ? resumePlayback() : pausePlayback()}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </Button>
              <Button variant="ghost" size="icon" onClick={stopPlayback}>
                <Square size={12} />
              </Button>
              <div className="flex-1" />
              <Select
                value={String(playbackSpeed)}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="h-7 text-xs w-20"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
                <option value="8">8x</option>
              </Select>
            </div>
          </div>
        )}

        {/* Saved sessions */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">
              Saved Sessions
            </h3>
            {sessions.map((s) => {
              const duration = s.endedAt
                ? Math.round((s.endedAt - s.startedAt) / 1000)
                : 0;
              const mins = Math.floor(duration / 60);
              const secs = duration % 60;

              return (
                <div
                  key={s.id}
                  className="p-3 rounded-md border border-[var(--border)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(s.startedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {mins}m {secs}s | {s.messageCount.toLocaleString()} msgs |{' '}
                    {formatBytes(s.totalSize)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        isPlaying ? stopPlayback() : startPlayback(s.id)
                      }
                    >
                      <Play size={12} className="mr-1" />
                      {isPlaying ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportSession(s.id, 'json')}
                    >
                      <Download size={12} className="mr-1" />
                      JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportSession(s.id, 'csv')}
                    >
                      <Download size={12} className="mr-1" />
                      CSV
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSession(s.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
