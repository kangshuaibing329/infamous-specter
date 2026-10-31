export type LearningDimension = 'meaning' | 'listening' | 'spelling' | 'morphology' | 'context';
export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3';
export type CognitiveSupport = 'none' | 'choice' | 'hint' | 'clue' | 'partial_answer' | 'partial_letters' | 'worked_example' | 'answer_revealed' | 'guided_follow_along';
export type TaskType = 'image_recognition' | 'audio_recognition' | 'meaning_retrieval' | 'spelling_production' | 'morphology_choice' | 'context_completion' | 'contrast_reasoning' | 'sentence_construction';
export type AnswerIntent = string | number | boolean | Record<string, unknown> | unknown[] | null;

export interface StudyEventIntent {
  eventType: 'study_answer_submitted';
  eventId: string;
  sessionId: string;
  gameId: string;
  gameVersion: string;
  logicVersion: string;
  schemaVersion: string;
  origin: 'local';
  contentPackId: string;
  contentPackVersion: string;
  wordId: string;
  senseId: string;
  taskId: string;
  taskVariantId: string;
  dimension: LearningDimension;
  taskType: TaskType;
  cognitiveSupport: CognitiveSupport;
  accessibilityModes?: string[];
  attemptIndex: number;
  answerIntent: AnswerIntent;
  evidencePolicyVersion: string;
  occurredAt: string;
}

export interface SessionDescriptor {
  sessionId: string;
  profileId: string;
  packId: string;
  packVersion: string;
  gameId: string;
  gameVersion: string;
  logicVersion: string;
  schemaVersion: string;
  seed: string;
  startedAt: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  taskIds: string[];
  currentTaskIndex: number;
}

export interface TaskInstance {
  taskId: string;
  taskVariantId: string;
  wordId: string;
  senseId: string;
  dimension: LearningDimension;
  taskType: TaskType;
  answerSpecRef: string;
  evidenceCap: EvidenceLevel;
  acceptedAnswers: string[];
}
