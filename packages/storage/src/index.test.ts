import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ContentPack } from '@wordquest/content';
import type { SessionDescriptor, StudyEventIntent } from '@wordquest/contracts';
import {
  appendStudyEvent, getInstalledContentPack, getMostRecentActiveSession, getSession, installContentPack,
  listStudyEvents, listStudyEventsForSession, saveLabState, saveSession, storageDatabase
} from './index';

beforeEach(async () => {
  await Promise.all([
    storageDatabase.labStates.clear(), storageDatabase.contentPacks.clear(), storageDatabase.sessions.clear(),
    storageDatabase.studyEvents.clear(), storageDatabase.gameEvents.clear(), storageDatabase.reviewStates.clear()
  ]);
});

const pack = {
  schemaVersion: '1.0.0',
  manifest: { packId: 'demo-pack', version: '0.1.0', status: 'preview', contentHash: 'a'.repeat(64) },
  words: [], senses: [], pronunciations: [], examples: [], assets: [], taskTemplates: [], units: [], sourceRefs: []
} as unknown as ContentPack;

const descriptor: SessionDescriptor = {
  sessionId: 'session-0001', profileId: 'profile-0001', packId: 'demo-pack', packVersion: '0.1.0',
  gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0', schemaVersion: '1.0.0',
  seed: 'seed-1', startedAt: '2026-10-31T00:00:00.000Z', status: 'active', taskIds: ['task-1'], currentTaskIndex: 0
};

const event: StudyEventIntent = {
  eventType: 'study_answer_submitted', eventId: 'event-0001', sessionId: descriptor.sessionId,
  gameId: descriptor.gameId, gameVersion: descriptor.gameVersion, logicVersion: descriptor.logicVersion,
  schemaVersion: '1.0.0', origin: 'local', contentPackId: 'demo-pack', contentPackVersion: '0.1.0',
  wordId: 'word-1', senseId: 'sense-1', taskId: 'task-1', taskVariantId: 'variant-1',
  dimension: 'meaning', taskType: 'meaning_retrieval', cognitiveSupport: 'none',
  attemptIndex: 1, answerIntent: '家庭', evidencePolicyVersion: '1.0.0-candidate',
  occurredAt: '2026-10-31T00:01:00.000Z'
};

describe('local storage repositories', () => {
  it('keeps the T1 lab table available after database migration', async () => {
    await saveLabState({ x: 500, y: 270, actionCount: 1, lastInput: 'button' });
    expect(await storageDatabase.labStates.get('t1-lab')).toBeTruthy();
  });

  it('installs and reads an immutable pack version', async () => {
    await installContentPack(pack);
    expect((await getInstalledContentPack('demo-pack', '0.1.0'))?.manifest.packId).toBe('demo-pack');
    expect(await getInstalledContentPack('demo-pack', '9.9.9')).toBeNull();
  });

  it('saves and reads a session pinned to one pack version', async () => {
    await saveSession(descriptor);
    expect((await getSession(descriptor.sessionId))?.packVersion).toBe('0.1.0');
  });

  it('finds the active session and its persisted attempts for recovery', async () => {
    await saveSession(descriptor);
    await appendStudyEvent(event, 'profile-0001');
    expect((await getMostRecentActiveSession('profile-0001'))?.sessionId).toBe(descriptor.sessionId);
    expect(await listStudyEventsForSession(descriptor.sessionId)).toHaveLength(1);
  });

  it('deduplicates repeated event IDs and preserves the original event', async () => {
    expect(await appendStudyEvent(event, 'profile-0001')).toBe('accepted');
    expect(await appendStudyEvent({ ...event, answerIntent: 'changed payload' }, 'profile-0001')).toBe('duplicate');
    const events = await listStudyEvents('profile-0001');
    expect(events).toHaveLength(1);
    expect(events[0].answerIntent).toBe('家庭');
  });
});
