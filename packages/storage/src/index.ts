import Dexie, { type Table } from 'dexie';
import { normalizeLabState, type LabState } from '@wordquest/game-core';

interface SavedLabRecord {
  id: 't1-lab';
  state: LabState;
  savedAt: string;
}

class WordQuestLocalDatabase extends Dexie {
  labStates!: Table<SavedLabRecord, string>;

  constructor() {
    super('wordquest-t1-local');
    this.version(1).stores({ labStates: 'id, savedAt' });
  }
}

const database = new WordQuestLocalDatabase();

export async function saveLabState(state: LabState): Promise<SavedLabRecord> {
  const normalized = normalizeLabState(state);
  if (!normalized) throw new Error('Refusing to persist an invalid lab state.');

  const record: SavedLabRecord = {
    id: 't1-lab',
    state: normalized,
    savedAt: new Date().toISOString()
  };
  await database.labStates.put(record);
  return record;
}

export async function loadLabState(): Promise<LabState | null> {
  const record = await database.labStates.get('t1-lab');
  if (!record) return null;
  return normalizeLabState(record.state);
}

export async function clearLabState(): Promise<void> {
  await database.labStates.delete('t1-lab');
}