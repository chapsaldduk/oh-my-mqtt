import Dexie, { type EntityTable } from 'dexie';
import type { ConnectionProfile } from '@/types/mqtt.ts';
import type { RecordingSession, RecordedMessage } from '@/types/recorder.ts';

const db = new Dexie('oh-my-mqtt') as Dexie & {
  connections: EntityTable<ConnectionProfile, 'id'>;
  recordings: EntityTable<RecordingSession, 'id'>;
  recordedMessages: EntityTable<RecordedMessage, 'id'>;
};

db.version(1).stores({
  connections: 'id, name, updatedAt',
  recordings: 'id, connectionId, startedAt',
  recordedMessages: 'id, sessionId, timestamp, topic',
});

export { db };
