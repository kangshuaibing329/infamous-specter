export type LabInputSource = 'system' | 'pointer' | 'keyboard' | 'button';

export interface LabState {
  x: number;
  y: number;
  actionCount: number;
  lastInput: LabInputSource;
}

export const INITIAL_LAB_STATE: LabState = {
  x: 480,
  y: 270,
  actionCount: 0,
  lastInput: 'system'
};

export type LabAction =
  | { type: 'MOVE_BY'; dx: number; dy: number; source: Exclude<LabInputSource, 'system'> }
  | { type: 'MOVE_TO'; x: number; y: number; source: Exclude<LabInputSource, 'system'> }
  | { type: 'RESET' };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function reduceLabState(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'MOVE_BY':
      return {
        x: clamp(state.x + action.dx, 56, 904),
        y: clamp(state.y + action.dy, 130, 410),
        actionCount: state.actionCount + 1,
        lastInput: action.source
      };
    case 'MOVE_TO':
      return {
        x: clamp(action.x, 56, 904),
        y: clamp(action.y, 130, 410),
        actionCount: state.actionCount + 1,
        lastInput: action.source
      };
    case 'RESET':
      return { ...INITIAL_LAB_STATE };
  }
}

export function normalizeLabState(candidate: unknown): LabState | null {
  if (typeof candidate !== 'object' || candidate === null) return null;
  const value = candidate as Record<string, unknown>;
  const validSources: LabInputSource[] = ['system', 'pointer', 'keyboard', 'button'];

  if (
    typeof value.x !== 'number' || !Number.isFinite(value.x) ||
    typeof value.y !== 'number' || !Number.isFinite(value.y) ||
    typeof value.actionCount !== 'number' || !Number.isFinite(value.actionCount) ||
    value.actionCount < 0 ||
    typeof value.lastInput !== 'string' ||
    !validSources.includes(value.lastInput as LabInputSource)
  ) {
    return null;
  }

  return {
    x: clamp(value.x, 56, 904),
    y: clamp(value.y, 130, 410),
    actionCount: Math.floor(value.actionCount),
    lastInput: value.lastInput as LabInputSource
  };
}