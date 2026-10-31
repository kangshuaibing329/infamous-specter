import Ajv2020 from 'ajv/dist/2020.js';
import type { AnySchema, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import contentPackSchema from './content-pack.schema.json';

export interface ContentPack {
  schemaVersion: string;
  manifest: {
    packId: string;
    version: string;
    title: string;
    packType: string;
    status: string;
    language: 'en';
    locale: 'zh-CN';
    target: { ageBands: string[]; gradeBands: string[]; difficulty?: string };
    progressScope: 'pack_scoped' | 'shared_verified_sense';
    review?: { status: string; reviewerIds?: string[]; reviewedAt?: string };
    wordCount: number;
    contentHash: string;
    assetManifestHash: string;
    sourceRefIds: string[];
    familyId: string;
    [key: string]: unknown;
  };
  units: Array<{ unitId: string; title: string; sortOrder: number; sourceRefIds?: string[] }>;
  words: Array<{ wordId: string; lemma: string; partOfSpeech: string[]; senseIds: string[]; sourceRefIds: string[]; [key: string]: unknown }>;
  senses: Array<{ senseId: string; wordId: string; glossZh: string; pronunciationIds: string[]; exampleIds: string[]; sourceRefIds: string[]; dimensionApplicability?: Record<string, string>; morphologyRuleIds?: string[]; assetIds?: string[]; [key: string]: unknown }>;
  pronunciations: Array<{ pronunciationId: string; senseId: string; ipa: string; accent: string; status: string; audioAssetId?: string; sourceRefIds: string[] }>;
  examples: Array<{ exampleId: string; senseId: string; textEn: string; textZh: string; sourceRefIds: string[] }>;
  assets: Array<{ assetId: string; kind: string; sha256: string; licenseStatus: string; sourceRefIds: string[] }>;
  taskTemplates: Array<{ taskTemplateId: string; senseId: string; dimension: string; taskType: string; answerSpecRef: string; supportPolicyId: string; evidenceCap: string; compatibleGameIds?: string[]; reviewStatus: string }>;
  sourceRefs: Array<{ sourceRefId: string; verificationStatus: string; rightsStatus?: string }>;
}

export interface ContentValidationIssue {
  code: string;
  path: string;
  message: string;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(contentPackSchema as AnySchema);

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function computeContentHash(pack: ContentPack): Promise<string> {
  const copy = JSON.parse(JSON.stringify(pack)) as ContentPack;
  const manifestForHash = Object.fromEntries(
    Object.entries(copy.manifest).filter(([key]) => key !== 'contentHash' && key !== 'assetManifestHash')
  );
  return sha256(canonicalJson({ ...copy, manifest: manifestForHash }));
}

export async function computeAssetManifestHash(assets: ContentPack['assets']): Promise<string> {
  const ordered = [...assets].sort((a, b) => a.assetId.localeCompare(b.assetId));
  return sha256(canonicalJson(ordered));
}

function uniqueIssues(items: Array<{ id: string }>, path: string): ContentValidationIssue[] {
  const seen = new Set<string>();
  const issues: ContentValidationIssue[] = [];
  for (const [index, item] of items.entries()) {
    if (seen.has(item.id)) issues.push({ code: 'CP-003', path: `${path}[${index}].id`, message: `Duplicate ID: ${item.id}` });
    seen.add(item.id);
  }
  return issues;
}

export async function validateContentPack(input: unknown): Promise<{ valid: boolean; issues: ContentValidationIssue[]; pack?: ContentPack }> {
  const issues: ContentValidationIssue[] = [];
  if (!validateSchema(input)) {
    for (const error of (validateSchema.errors ?? []) as ErrorObject[]) {
      issues.push({ code: 'CP-002', path: error.instancePath || '$', message: error.message ?? 'Schema validation failed' });
    }
    return { valid: false, issues };
  }

  const pack = input as ContentPack;
  issues.push(...uniqueIssues(pack.words.map((x) => ({ id: x.wordId })), '$.words'));
  issues.push(...uniqueIssues(pack.senses.map((x) => ({ id: x.senseId })), '$.senses'));
  issues.push(...uniqueIssues(pack.pronunciations.map((x) => ({ id: x.pronunciationId })), '$.pronunciations'));
  issues.push(...uniqueIssues(pack.examples.map((x) => ({ id: x.exampleId })), '$.examples'));
  issues.push(...uniqueIssues(pack.assets.map((x) => ({ id: x.assetId })), '$.assets'));
  issues.push(...uniqueIssues(pack.taskTemplates.map((x) => ({ id: x.taskTemplateId })), '$.taskTemplates'));
  issues.push(...uniqueIssues(pack.sourceRefs.map((x) => ({ id: x.sourceRefId })), '$.sourceRefs'));

  const wordMap = new Map(pack.words.map((word) => [word.wordId, word]));
  const senseMap = new Map(pack.senses.map((sense) => [sense.senseId, sense]));
  const pronunciationIds = new Set(pack.pronunciations.map((item) => item.pronunciationId));
  const exampleIds = new Set(pack.examples.map((item) => item.exampleId));
  const assetMap = new Map(pack.assets.map((item) => [item.assetId, item]));
  const sourceIds = new Set(pack.sourceRefs.map((item) => item.sourceRefId));

  if (pack.manifest.wordCount !== pack.words.length) {
    issues.push({ code: 'CP-004', path: '$.manifest.wordCount', message: 'wordCount does not match words.length' });
  }
  for (const [index, word] of pack.words.entries()) {
    for (const senseId of word.senseIds) {
      if (senseMap.get(senseId)?.wordId !== word.wordId) issues.push({ code: 'CP-004', path: `$.words[${index}].senseIds`, message: `Missing or mismatched sense: ${senseId}` });
    }
    for (const sourceId of word.sourceRefIds) if (!sourceIds.has(sourceId)) issues.push({ code: 'CP-004', path: `$.words[${index}].sourceRefIds`, message: `Unknown source: ${sourceId}` });
  }
  for (const [index, sense] of pack.senses.entries()) {
    if (!wordMap.has(sense.wordId)) issues.push({ code: 'CP-004', path: `$.senses[${index}].wordId`, message: `Unknown word: ${sense.wordId}` });
    for (const id of sense.pronunciationIds) if (!pronunciationIds.has(id)) issues.push({ code: 'CP-004', path: `$.senses[${index}].pronunciationIds`, message: `Unknown pronunciation: ${id}` });
    for (const id of sense.exampleIds) if (!exampleIds.has(id)) issues.push({ code: 'CP-004', path: `$.senses[${index}].exampleIds`, message: `Unknown example: ${id}` });
    for (const id of sense.assetIds ?? []) if (!assetMap.has(id)) issues.push({ code: 'CP-004', path: `$.senses[${index}].assetIds`, message: `Unknown asset: ${id}` });
    for (const id of sense.sourceRefIds) if (!sourceIds.has(id)) issues.push({ code: 'CP-004', path: `$.senses[${index}].sourceRefIds`, message: `Unknown source: ${id}` });
  }
  for (const [index, task] of pack.taskTemplates.entries()) {
    if (!senseMap.has(task.senseId)) issues.push({ code: 'CP-004', path: `$.taskTemplates[${index}].senseId`, message: `Unknown sense: ${task.senseId}` });
    if (task.dimension === 'listening') {
      const sense = senseMap.get(task.senseId);
      const playable = pack.pronunciations.some((p) => p.senseId === task.senseId && p.status === 'approved' && p.audioAssetId && assetMap.get(p.audioAssetId)?.licenseStatus === 'approved');
      if (!playable) issues.push({ code: 'CP-008', path: `$.taskTemplates[${index}]`, message: `Listening task has no approved licensed audio for ${sense?.senseId ?? task.senseId}` });
    }
    if (task.dimension === 'morphology') {
      const sense = senseMap.get(task.senseId);
      if (!sense?.morphologyRuleIds?.length) issues.push({ code: 'CP-011', path: `$.taskTemplates[${index}]`, message: 'Morphology task requires at least one reviewed morphology rule reference' });
    }
  }
  for (const [index, pronunciation] of pack.pronunciations.entries()) {
    if (!senseMap.has(pronunciation.senseId)) issues.push({ code: 'CP-004', path: `$.pronunciations[${index}].senseId`, message: `Unknown sense: ${pronunciation.senseId}` });
    for (const id of pronunciation.sourceRefIds) if (!sourceIds.has(id)) issues.push({ code: 'CP-004', path: `$.pronunciations[${index}].sourceRefIds`, message: `Unknown source: ${id}` });
  }
  for (const [index, example] of pack.examples.entries()) {
    if (!senseMap.has(example.senseId)) issues.push({ code: 'CP-004', path: `$.examples[${index}].senseId`, message: `Unknown sense: ${example.senseId}` });
    for (const id of example.sourceRefIds) if (!sourceIds.has(id)) issues.push({ code: 'CP-004', path: `$.examples[${index}].sourceRefIds`, message: `Unknown source: ${id}` });
  }
  for (const [index, asset] of pack.assets.entries()) {
    for (const id of asset.sourceRefIds) if (!sourceIds.has(id)) issues.push({ code: 'CP-004', path: `$.assets[${index}].sourceRefIds`, message: `Unknown source: ${id}` });
  }

  const expectedAssetHash = await computeAssetManifestHash(pack.assets);
  if (expectedAssetHash !== pack.manifest.assetManifestHash) issues.push({ code: 'CP-009', path: '$.manifest.assetManifestHash', message: 'Asset manifest hash mismatch' });
  const expectedContentHash = await computeContentHash(pack);
  if (expectedContentHash !== pack.manifest.contentHash) issues.push({ code: 'CP-009', path: '$.manifest.contentHash', message: 'Content hash mismatch' });

  return { valid: issues.length === 0, issues, pack };
}

export function getPackAvailability(pack: ContentPack): 'customer' | 'internal_preview' | 'blocked' {
  if (pack.manifest.status === 'published' && pack.manifest.review?.status === 'approved') return 'customer';
  if (pack.manifest.status === 'preview') return 'internal_preview';
  return 'blocked';
}
