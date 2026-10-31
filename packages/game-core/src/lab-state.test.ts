import { describe, expect, it } from 'vitest';
import {
  INITIAL_LAB_STATE,
  normalizeLabState,
  reduceLabState
} from './lab-state';

describe('T1 lab state reducer', () => {
  it('applies button movement and records the input source', () => {
    const next = reduceLabState(INITIAL_LAB_STATE, {
      type: 'MOVE_BY', dx: 36, dy: 0, source: 'button'
    });
    expect(next).toEqual({
      x: 516, y: 270, actionCount: 1, lastInput: 'button'
    });
  });

  it('clamps pointer movement inside the stage bounds', () => {
    const next = reduceLabState(INITIAL_LAB_STATE, {
      type: 'MOVE_TO', x: 1200, y: -100, source: 'pointer'
    });
    expect(next.x).toBe(904);
    expect(next.y).toBe(130);
    expect(next.actionCount).toBe(1);
  });

  it('resets to the initial state', () => {
    const moved = reduceLabState(INITIAL_LAB_STATE, {
      type: 'MOVE_BY', dx: 36, dy: 36, source: 'keyboard'
    });
    expect(reduceLabState(moved, { type: 'RESET' })).toEqual(INITIAL_LAB_STATE);
  });
});

describe('normalizeLabState', () => {
  it('rejects malformed persisted state', () => {
    expect(normalizeLabState({ x: '480', y: 270 })).toBeNull();
    expect(normalizeLabState(null)).toBeNull();
    expect(normalizeLabState({
      x: 480, y: 270, actionCount: -1, lastInput: 'button'
    })).toBeNull();
  });

  it('normalizes valid persisted state and clamps coordinates', () => {
    expect(normalizeLabState({
      x: 999, y: 100, actionCount: 2.8, lastInput: 'keyboard'
    })).toEqual({
      x: 904, y: 130, actionCount: 2, lastInput: 'keyboard'
    });
  });
});