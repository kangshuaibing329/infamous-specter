import { describe, expect, it } from 'vitest';
import starterPack from '../../../content-packs/high-frequency-starter/0.1.0/content-pack.json';
import { advanceSession, getCurrentTask, restoreSession, startSession } from './index';
import type { ContentPack } from '@wordquest/content';

const pack = starterPack as unknown as ContentPack;
const input = {
  pack, profileId: 'p1', gameId: 'g01-island-exploration', gameVersion: '0.1.0',
  logicVersion: '0.1.0', seed: 'seed', startedAt: '2026-10-31T00:00:00.000Z',
  sessionId: 's1'
};

describe('session adapter', () => {
  it('requires explicit permission to use a preview pack', async () => {
    await expect(startSession(input)).rejects.toThrow(/internal preview/);
  });

  it('pins pack version and deterministically creates compatible tasks', async () => {
    const a = await startSession({ ...input, allowInternalPreview: true });
    const b = await startSession({ ...input, allowInternalPreview: true });
    expect(a.descriptor.packId).toBe('high-frequency-starter');
    expect(a.descriptor.packVersion).toBe('0.1.0');
    expect(a.tasks.map((x) => x.taskVariantId)).toEqual(b.tasks.map((x) => x.taskVariantId));
    expect(a.tasks).toHaveLength(30);
    expect(getCurrentTask(a)?.acceptedAnswers.length).toBeGreaterThan(0);
  });

  it('does not allow a game to start when no compatible tasks exist', async () => {
    await expect(startSession({ ...input, gameId: 'g05-sonic-skate', allowInternalPreview: true })).rejects.toThrow(/No task templates/);
  });

  it('restores the same deterministic task queue and saved task index', async () => {
    let session = await startSession({ ...input, allowInternalPreview: true });
    session = advanceSession(advanceSession(session));
    const restored = await restoreSession(session.descriptor, pack);
    expect(restored.descriptor.currentTaskIndex).toBe(2);
    expect(restored.descriptor.packVersion).toBe('0.1.0');
    expect(getCurrentTask(restored)?.taskVariantId).toBe(session.tasks[2].taskVariantId);
  });

  it('advances and completes the session without changing the pinned pack version', async () => {
    let session = await startSession({ ...input, allowInternalPreview: true });
    for (let index = 0; index < session.tasks.length; index++) session = advanceSession(session);
    expect(session.descriptor.status).toBe('completed');
    expect(session.descriptor.packVersion).toBe('0.1.0');
  });
});
