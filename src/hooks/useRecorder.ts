import { useRecorderStore } from '@/stores/recorderStore.ts';

export function useRecorder() {
  const store = useRecorderStore();

  return {
    isRecording: store.isRecording,
    isPlaying: store.isPlaying,
    isPaused: store.isPaused,
    currentSession: store.currentSession,
    sessions: store.sessions,
    playbackSpeed: store.playbackSpeed,
    playbackPosition: store.playbackPosition,
    playbackDuration: store.playbackDuration,
    startRecording: store.startRecording,
    stopRecording: store.stopRecording,
    deleteSession: store.deleteSession,
    startPlayback: store.startPlayback,
    stopPlayback: store.stopPlayback,
    pausePlayback: store.pausePlayback,
    resumePlayback: store.resumePlayback,
    seekPlayback: store.seekPlayback,
    setPlaybackSpeed: store.setPlaybackSpeed,
    exportSession: store.exportSession,
    loadSessions: store.loadSessions,
  };
}
