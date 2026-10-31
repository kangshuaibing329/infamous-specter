import { describe, expect, it } from 'vitest';
import { buildAcceptedAnswers, createStudyEventIntent, evaluateAnswer, getNextReviewWindow, normalizeAnswer } from './index';
import type { TaskInstance } from '@wordquest/contracts';

const task: TaskInstance = {
  taskId: 'task-1', taskVariantId: 'variant-1', wordId: 'word-1', senseId: 'sense-1',
  dimension: 'meaning', taskType: 'meaning_retrieval', answerSpecRef: 'meaning/v1',
  evidenceCap: 'E2', acceptedAnswers: ['家庭', '家人']
};

describe('answer normalization and accepted variants', () => {
  it('normalizes full-width and whitespace variants', () => {
    expect(normalizeAnswer(' 家　庭！')).toBe('家庭');
  });
  it('splits editorial gloss alternatives', () => {
    expect(buildAcceptedAnswers('家庭；家人')).toEqual(['家庭', '家人']);
  });
});

describe('provisional evidence policy', () => {
  it('awards at most E2 for an unprompted first valid answer', () => {
    expect(evaluateAnswer({ answer: '家庭', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: 'none', taskEvidenceCap: 'E3' }).evidenceLevel).toBe('E2');
  });
  it('caps option and hint assisted answers at E1', () => {
    for (const support of ['choice', 'hint', 'clue', 'partial_answer', 'partial_letters'] as const) {
      expect(evaluateAnswer({ answer: '家庭', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: support, taskEvidenceCap: 'E2' }).evidenceLevel).toBe('E1');
    }
  });
  it('caps answer revealed or worked example at E0', () => {
    for (const support of ['worked_example', 'answer_revealed', 'guided_follow_along'] as const) {
      expect(evaluateAnswer({ answer: '家庭', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: support, taskEvidenceCap: 'E2' }).evidenceLevel).toBe('E0');
    }
  });
  it('caps a correct retry after an incorrect attempt at E1', () => {
    expect(evaluateAnswer({ answer: '家庭', acceptedAnswers: task.acceptedAnswers, attemptIndex: 2, cognitiveSupport: 'none', taskEvidenceCap: 'E2' }).evidenceLevel).toBe('E1');
  });
  it('does not award evidence for incorrect answers', () => {
    expect(evaluateAnswer({ answer: '学校', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: 'none', taskEvidenceCap: 'E2' })).toMatchObject({ correct: false, evidenceLevel: null });
  });
  it('does not consume an attempt on a technical input error', () => {
    expect(evaluateAnswer({ answer: '', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: 'none', taskEvidenceCap: 'E2', technicalInputError: true })).toMatchObject({ attemptConsumed: false, feedbackCode: 'technical_input_error' });
  });
  it('never awards E3 inside a same-session evaluation', () => {
    expect(evaluateAnswer({ answer: '家庭', acceptedAnswers: task.acceptedAnswers, attemptIndex: 1, cognitiveSupport: 'none', taskEvidenceCap: 'E3' }).evidenceLevel).not.toBe('E3');
  });
});

describe('event intent contract', () => {
  it('stores local answer intent without client verdict or evidence claims', () => {
    const event = createStudyEventIntent({
      ids: { eventId: 'event-0001', occurredAt: '2026-10-31T00:00:00.000Z' },
      session: { sessionId: 'session-0001', gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0' },
      pack: { packId: 'high-frequency-starter', version: '0.1.0' }, task,
      answerIntent: '家庭', attemptIndex: 1, cognitiveSupport: 'none', evidencePolicyVersion: '1.0.0-candidate'
    });
    expect(event.origin).toBe('local');
    expect(event).not.toHaveProperty('verdict');
    expect(event).not.toHaveProperty('evidenceLevel');
    expect(event).not.toHaveProperty('masteryScore');
  });
});

describe('delayed review windows', () => {
  it('uses the candidate D+1 and D+7 windows from the original anchor', () => {
    expect(getNextReviewWindow('2026-10-31T00:00:00.000Z', [])).toEqual({
      checkpoint: 'D+1', minAt: '2026-11-01T00:00:00.000Z', targetAt: '2026-11-01T12:00:00.000Z', maxAt: '2026-11-02T00:00:00.000Z'
    });
    expect(getNextReviewWindow('2026-10-31T00:00:00.000Z', ['D+1'])?.checkpoint).toBe('D+7');
    expect(getNextReviewWindow('2026-10-31T00:00:00.000Z', ['D+1', 'D+7'])).toBeNull();
  });
});
