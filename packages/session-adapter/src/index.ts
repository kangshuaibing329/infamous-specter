import type { SessionDescriptor, TaskInstance } from '@wordquest/contracts';
import type { ContentPack } from '@wordquest/content';
import { buildAcceptedAnswers } from '@wordquest/learning-core';
import { validateContentPack } from '@wordquest/content';

export interface StartSessionInput {
  pack: ContentPack;
  profileId: string;
  gameId: string;
  gameVersion: string;
  logicVersion: string;
  seed: string;
  startedAt: string;
  allowInternalPreview?: boolean;
  sessionId: string;
}

export interface ActiveSession {
  descriptor: SessionDescriptor;
  pack: ContentPack;
  tasks: TaskInstance[];
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function startSession(input: StartSessionInput): Promise<ActiveSession> {
  const { pack } = input;
  const validation = await validateContentPack(pack);
  if (!validation.valid) throw new Error('Content pack validation failed: ' + validation.issues.slice(0, 3).map((issue) => issue.message).join('; '));
  if (pack.manifest.status === 'published') {
    if (pack.manifest.review?.status !== 'approved') throw new Error('Published content pack is missing approved editorial review.');
  } else if (pack.manifest.status !== 'preview' || !input.allowInternalPreview) {
    throw new Error('Only published packs or explicitly authorized internal preview packs may start a session.');
  }
  const senses = new Map(pack.senses.map((sense) => [sense.senseId, sense]));
  const words = new Map(pack.words.map((word) => [word.wordId, word]));
  const templates = pack.taskTemplates.filter((task) => task.compatibleGameIds?.includes(input.gameId));
  if (templates.length === 0) throw new Error(`No task templates are compatible with game ${input.gameId}.`);

  const tasks = seededShuffle(templates, input.seed).map((template, index) => {
    const sense = senses.get(template.senseId);
    const word = sense ? words.get(sense.wordId) : undefined;
    if (!sense || !word) throw new Error(`Task template ${template.taskTemplateId} references missing content.`);
    return {
      taskId: `${input.sessionId}:task:${index + 1}`,
      taskVariantId: template.taskTemplateId,
      wordId: word.wordId,
      senseId: sense.senseId,
      dimension: template.dimension as TaskInstance['dimension'],
      taskType: template.taskType as TaskInstance['taskType'],
      answerSpecRef: template.answerSpecRef,
      evidenceCap: template.evidenceCap as TaskInstance['evidenceCap'],
      acceptedAnswers: template.dimension === 'meaning' ? buildAcceptedAnswers(sense.glossZh) : []
    };
  });

  const descriptor: SessionDescriptor = {
    sessionId: input.sessionId,
    profileId: input.profileId,
    packId: pack.manifest.packId,
    packVersion: pack.manifest.version,
    gameId: input.gameId,
    gameVersion: input.gameVersion,
    logicVersion: input.logicVersion,
    schemaVersion: pack.schemaVersion,
    seed: input.seed,
    startedAt: input.startedAt,
    status: 'active',
    taskIds: tasks.map((task) => task.taskId),
    currentTaskIndex: 0
  };
  return { descriptor, pack, tasks };
}

export function getCurrentTask(session: ActiveSession): TaskInstance | null {
  return session.tasks[session.descriptor.currentTaskIndex] ?? null;
}

export function advanceSession(session: ActiveSession): ActiveSession {
  const nextIndex = Math.min(session.descriptor.currentTaskIndex + 1, session.tasks.length);
  const completed = nextIndex >= session.tasks.length;
  return {
    ...session,
    descriptor: {
      ...session.descriptor,
      currentTaskIndex: nextIndex,
      status: completed ? 'completed' : session.descriptor.status
    }
  };
}
