import Dexie, { type Table } from 'dexie';
import type { ContentPack } from '@wordquest/content';
import type { SessionDescriptor, StudyEventIntent, LearningDimension } from '@wordquest/contracts';
import { normalizeLabState, type LabState } from '@wordquest/game-core';

interface SavedLabRecord {
  id: 't1-lab';
  state: LabState;
  savedAt: string;
}

export interface ContentPackRecord {
  id: string;
  packId: string;
  version: string;
  status: string;
  contentHash: string;
  payload: ContentPack;
  installedAt: string;
}

export interface SessionRecord {
  sessionId: string;
  profileId: string;
  packId: string;
  packVersion: string;
  status: SessionDescriptor['status'];
  startedAt: string;
  descriptor: SessionDescriptor;
  snapshot?: unknown;
}

export interface StoredStudyEvent extends StudyEventIntent {
  profileId: string;
}

export interface StoredGameEvent {
  eventId: string;
  sessionId: string;
  profileId: string;
  occurredAt: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface ReviewStateRecord {
  id: string;
  profileId: string;
  wordId: string;
  senseId: string;
  dimension: LearningDimension;
  firstApprovedExposureAt: string;
  completedCheckpoints: Array<'D+1' | 'D+7'>;
  nextCheckpointAt?: string;
  updatedAt: string;
}

class WordQuestLocalDatabase extends Dexie {
  labStates!: Table<SavedLabRecord, string>;
  contentPacks!: Table<ContentPackRecord, string>;
  sessions!: Table<SessionRecord, string>;
  studyEvents!: Table<StoredStudyEvent, string>;
  gameEvents!: Table<StoredGameEvent, string>;
  reviewStates!: Table<ReviewStateRecord, string>;

  constructor() {
    super('wordquest-t1-local');
    this.version(1).stores({ labStates: 'id, savedAt' });
    this.version(2).stores({
      labStates: 'id, savedAt',
      contentPacks: 'id, packId, version, status, installedAt',
      sessions: 'sessionId, profileId, packId, packVersion, status, startedAt',
      studyEvents: 'eventId, profileId, sessionId, contentPackId, contentPackVersion, wordId, senseId, dimension, occurredAt',
      gameEvents: 'eventId, profileId, sessionId, occurredAt',
      reviewStates: 'id, profileId, wordId, senseId, dimension, nextCheckpointAt'
    });
  }
}

export const storageDatabase = new WordQuestLocalDatabase();

export async function saveLabState(state: LabState): Promise<SavedLabRecord> {
  const normalized = normalizeLabState(state);
  if (!normalized) throw new Error('Refusing to persist an invalid lab state.');
  const record: SavedLabRecord = { id: 't1-lab', state: normalized, savedAt: new Date().toISOString() };
  await storageDatabase.labStates.put(record);
  return record;
}

export async function loadLabState(): Promise<LabState | null> {
  const record = await storageDatabase.labStates.get('t1-lab');
  if (!record) return null;
  return normalizeLabState(record.state);
}

export async function clearLabState(): Promise<void> {
  await storageDatabase.labStates.delete('t1-lab');
}

export async function installContentPack(pack: ContentPack): Promise<ContentPackRecord> {
  const record: ContentPackRecord = {
    id: `${pack.manifest.packId}:${pack.manifest.version}`,
    packId: pack.manifest.packId,
    version: pack.manifest.version,
    status: pack.manifest.status,
    contentHash: pack.manifest.contentHash,
    payload: pack,
    installedAt: new Date().toISOString()
  };
  await storageDatabase.contentPacks.put(record);
  return record;
}

export async function getInstalledContentPack(packId: string, version: string): Promise<ContentPack | null> {
  const record = await storageDatabase.contentPacks.get(`${packId}:${version}`);
  return record?.payload ?? null;
}

export async function listInstalledContentPacks(): Promise<ContentPackRecord[]> {
  return storageDatabase.contentPacks.orderBy('installedAt').reverse().toArray();
}

export async function saveSession(descriptor: SessionDescriptor, snapshot?: unknown): Promise<SessionRecord> {
  const record: SessionRecord = {
    sessionId: descriptor.sessionId,
    profileId: descriptor.profileId,
    packId: descriptor.packId,
    packVersion: descriptor.packVersion,
    status: descriptor.status,
    startedAt: descriptor.startedAt,
    descriptor,
    snapshot
  };
  await storageDatabase.sessions.put(record);
  return record;
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  return (await storageDatabase.sessions.get(sessionId)) ?? null;
}

export async function appendStudyEvent(event: StudyEventIntent, profileId: string): Promise<'accepted' | 'duplicate'> {
  return storageDatabase.transaction('rw', storageDatabase.studyEvents, async () => {
    const existing = await storageDatabase.studyEvents.get(event.eventId);
    if (existing) return 'duplicate';
    await storageDatabase.studyEvents.add({ ...event, profileId });
    return 'accepted';
  });
}

export async function listStudyEvents(profileId: string): Promise<StoredStudyEvent[]> {
  return storageDatabase.studyEvents.where('profileId').equals(profileId).sortBy('occurredAt');
}

export async function appendGameEvent(event: StoredGameEvent): Promise<'accepted' | 'duplicate'> {
  return storageDatabase.transaction('rw', storageDatabase.gameEvents, async () => {
    const existing = await storageDatabase.gameEvents.get(event.eventId);
    if (existing) return 'duplicate';
    await storageDatabase.gameEvents.add(event);
    return 'accepted';
  });
}

export async function saveReviewState(record: ReviewStateRecord): Promise<void> {
  await storageDatabase.reviewStates.put(record);
}

export async function listReviewStates(profileId: string): Promise<ReviewStateRecord[]> {
  return storageDatabase.reviewStates.where('profileId').equals(profileId).toArray();
}

export async function getMostRecentActiveSession(profileId: string): Promise<SessionRecord | null> {
  const records = await storageDatabase.sessions.where('profileId').equals(profileId).toArray();
  return records
    .filter((record) => record.status === 'active' || record.status === 'paused')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

export async function listStudyEventsForSession(sessionId: string): Promise<StoredStudyEvent[]> {
  return storageDatabase.studyEvents.where('sessionId').equals(sessionId).sortBy('occurredAt');
}
