import { describe, expect, it } from 'vitest';
import { advanceSession, getCurrentTask, startSession } from './index';
import type { ContentPack } from '@wordquest/content';

const pack = {
  schemaVersion: '1.0.0',
  manifest: { packId: 'demo-pack', version: '0.1.0', title: 'Demo', packType: 'high_frequency', status: 'preview', language: 'en', locale: 'zh-CN', target: { ageBands: ['primary-upper'], gradeBands: ['grade5'] }, progressScope: 'pack_scoped', wordCount: 1, contentHash: '0'.repeat(64), assetManifestHash: '0'.repeat(64), sourceRefIds: ['src-1'], familyId: 'high-frequency', review: { status: 'not_reviewed' } },
  units: [], words: [{ wordId: 'word-1', lemma: 'family', partOfSpeech: ['noun'], senseIds: ['sense-1'], sourceRefIds: ['src-1'] }],
  senses: [{ senseId: 'sense-1', wordId: 'word-1', glossZh: '家庭；家人', pronunciationIds: [], exampleIds: [], sourceRefIds: ['src-1'] }],
  pronunciations: [], examples: [], assets: [],
  taskTemplates: [{ taskTemplateId: 'template-1', senseId: 'sense-1', dimension: 'meaning', taskType: 'meaning_retrieval', answerSpecRef: 'meaning/v1', supportPolicyId: 'support/v1', evidenceCap: 'E2', compatibleGameIds: ['g01-island-exploration'], reviewStatus: 'draft' }],
  sourceRefs: []
} as unknown as ContentPack;

describe('session adapter', () => {
  it('requires explicit permission to use a preview pack', () => {
    expect(() => startSession({ pack, profileId: 'p1', gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0', seed: 'seed', startedAt: '2026-10-31T00:00:00Z', sessionId: 's1' })).toThrow(/internal preview permission/);
  });
  it('pins pack version and deterministically creates compatible tasks', () => {
    const input = { pack, profileId: 'p1', gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0', seed: 'seed', startedAt: '2026-10-31T00:00:00Z', allowInternalPreview: true, sessionId: 's1' };
    const a = startSession(input);
    const b = startSession(input);
    expect(a.descriptor.packId).toBe('demo-pack');
    expect(a.descriptor.packVersion).toBe('0.1.0');
    expect(a.tasks.map((x) => x.taskVariantId)).toEqual(b.tasks.map((x) => x.taskVariantId));
    expect(getCurrentTask(a)?.acceptedAnswers).toEqual(['家庭', '家人']);
  });
  it('does not allow a game to start when no compatible tasks exist', () => {
    expect(() => startSession({ pack, profileId: 'p1', gameId: 'g05-sonic-skate', gameVersion: '0.1.0', logicVersion: '0.1.0', seed: 'seed', startedAt: '2026-10-31T00:00:00Z', allowInternalPreview: true, sessionId: 's1' })).toThrow(/No reviewed task templates/);
  });
  it('advances and completes the session without changing the pinned pack version', () => {
    const session = startSession({ pack, profileId: 'p1', gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0', seed: 'seed', startedAt: '2026-10-31T00:00:00Z', allowInternalPreview: true, sessionId: 's1' });
    const next = advanceSession(session);
    expect(next.descriptor.status).toBe('completed');
    expect(next.descriptor.packVersion).toBe('0.1.0');
  });
});
