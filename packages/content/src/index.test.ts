import { describe, expect, it } from 'vitest';
import starter from '../../../content-packs/high-frequency-starter/0.1.0/content-pack.json';
import school from '../../../content-packs/theme-school-life/0.1.0/content-pack.json';
import nature from '../../../content-packs/theme-nature-science/0.1.0/content-pack.json';
import { getPackAvailability, validateContentPack, type ContentPack } from './index';

describe('candidate content pack runtime validation', () => {
  it.each([starter, school, nature])('validates $manifest.packId with schema, references and hashes', async (pack) => {
    const result = await validateContentPack(pack);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('blocks a mismatched wordCount', async () => {
    const invalid = structuredClone(starter) as ContentPack;
    invalid.manifest.wordCount += 1;
    const result = await validateContentPack(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === '$.manifest.wordCount')).toBe(true);
  });

  it('blocks a listening task when no approved licensed audio exists', async () => {
    const invalid = structuredClone(starter) as ContentPack;
    invalid.taskTemplates.push({
      taskTemplateId: 'listening-test', senseId: invalid.senses[0].senseId,
      dimension: 'listening', taskType: 'audio_recognition', answerSpecRef: 'audio/v1',
      supportPolicyId: 'support/v1', evidenceCap: 'E1', reviewStatus: 'draft'
    });
    const result = await validateContentPack(invalid);
    expect(result.issues.some((issue) => issue.code === 'CP-008')).toBe(true);
  });

  it('does not classify internal preview candidates as customer packs', () => {
    expect(getPackAvailability(starter as ContentPack)).toBe('internal_preview');
  });
});
