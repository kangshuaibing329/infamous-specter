import type { CognitiveSupport, EvidenceLevel, StudyEventIntent, TaskInstance } from '@wordquest/contracts';

const evidenceRank: Record<EvidenceLevel, number> = { E0: 0, E1: 1, E2: 2, E3: 3 };

export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[\s\u3000.,!?;:，。！？；：、'"“”‘’()（）\[\]【】]/g, '');
}

export function buildAcceptedAnswers(glossZh: string): string[] {
  return [...new Set(glossZh.split(/[；;、，,\/]/).map((part) => normalizeAnswer(part)).filter(Boolean))];
}

function supportEvidenceCap(support: CognitiveSupport): EvidenceLevel {
  if (support === 'none') return 'E2';
  if (support === 'worked_example' || support === 'answer_revealed' || support === 'guided_follow_along') return 'E0';
  return 'E1';
}

function lowerEvidence(a: EvidenceLevel, b: EvidenceLevel): EvidenceLevel {
  return evidenceRank[a] <= evidenceRank[b] ? a : b;
}

export interface EvaluateAnswerInput {
  answer: string;
  acceptedAnswers: string[];
  attemptIndex: number;
  cognitiveSupport: CognitiveSupport;
  taskEvidenceCap: EvidenceLevel;
  technicalInputError?: boolean;
}

export interface AnswerEvaluation {
  correct: boolean;
  attemptConsumed: boolean;
  evidenceLevel: EvidenceLevel | null;
  feedbackCode: 'correct' | 'incorrect' | 'technical_input_error';
}

export function evaluateAnswer(input: EvaluateAnswerInput): AnswerEvaluation {
  if (input.technicalInputError) {
    return { correct: false, attemptConsumed: false, evidenceLevel: null, feedbackCode: 'technical_input_error' };
  }
  const answer = normalizeAnswer(input.answer);
  const correct = answer.length > 0 && input.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === answer);
  if (!correct) {
    return { correct: false, attemptConsumed: true, evidenceLevel: null, feedbackCode: 'incorrect' };
  }

  let cap = lowerEvidence(input.taskEvidenceCap, supportEvidenceCap(input.cognitiveSupport));
  if (input.attemptIndex > 1 && evidenceRank[cap] > evidenceRank.E1) cap = 'E1';
  // A same-session task can only provide E2 at most. E3 requires a delayed,
  // cross-game and cross-taskType checkpoint and is never issued here.
  if (evidenceRank[cap] > evidenceRank.E2) cap = 'E2';
  return { correct: true, attemptConsumed: true, evidenceLevel: cap, feedbackCode: 'correct' };
}

export interface CreateStudyEventInput {
  ids: { eventId: string; occurredAt: string };
  session: { sessionId: string; gameId: string; gameVersion: string; logicVersion: string };
  pack: { packId: string; version: string };
  task: TaskInstance;
  answerIntent: string;
  attemptIndex: number;
  cognitiveSupport: CognitiveSupport;
  accessibilityModes?: string[];
  evidencePolicyVersion: string;
}

export function createStudyEventIntent(input: CreateStudyEventInput): StudyEventIntent {
  return {
    eventType: 'study_answer_submitted',
    eventId: input.ids.eventId,
    sessionId: input.session.sessionId,
    gameId: input.session.gameId,
    gameVersion: input.session.gameVersion,
    logicVersion: input.session.logicVersion,
    schemaVersion: '1.0.0',
    origin: 'local',
    contentPackId: input.pack.packId,
    contentPackVersion: input.pack.version,
    wordId: input.task.wordId,
    senseId: input.task.senseId,
    taskId: input.task.taskId,
    taskVariantId: input.task.taskVariantId,
    dimension: input.task.dimension,
    taskType: input.task.taskType,
    cognitiveSupport: input.cognitiveSupport,
    accessibilityModes: input.accessibilityModes ?? [],
    attemptIndex: input.attemptIndex,
    answerIntent: input.answerIntent,
    evidencePolicyVersion: input.evidencePolicyVersion,
    occurredAt: input.ids.occurredAt
  };
}

export interface ReviewWindow {
  checkpoint: 'D+1' | 'D+7';
  minAt: string;
  targetAt: string;
  maxAt: string;
}

export function getNextReviewWindow(anchorAt: string, completed: Array<'D+1' | 'D+7'>): ReviewWindow | null {
  const anchor = new Date(anchorAt);
  if (!Number.isFinite(anchor.getTime())) throw new Error('Invalid firstApprovedExposureAt anchor.');
  const checkpoint = !completed.includes('D+1') ? 'D+1' : !completed.includes('D+7') ? 'D+7' : null;
  if (!checkpoint) return null;
  const hours = checkpoint === 'D+1' ? { min: 24, target: 36, max: 48 } : { min: 144, target: 168, max: 192 };
  const addHours = (n: number) => new Date(anchor.getTime() + n * 60 * 60 * 1000).toISOString();
  return { checkpoint, minAt: addHours(hours.min), targetAt: addHours(hours.target), maxAt: addHours(hours.max) };
}
