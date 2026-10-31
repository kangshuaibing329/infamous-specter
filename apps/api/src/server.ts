import Fastify, { type FastifyInstance } from 'fastify';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateContentPack, type ContentPack } from '@wordquest/content';

interface CatalogCandidate {
  packId: string;
  version: string;
  familyId: string;
  title: string;
  status: string;
  customerSelectable: boolean;
  wordCount: number;
  gradeBands: string[];
  contentPath: string;
}
interface ContentCatalog { candidatePacks?: CatalogCandidate[]; }

export interface ApiData {
  packs: ContentPack[];
  catalog: ContentCatalog;
}

export function createApiServer(data: ApiData): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/v1/health', async (request) => ({
    status: 'ok',
    serviceVersion: '0.1.0',
    requestId: request.id
  }));

  app.get('/api/v1/content-packs', async (request) => {
    const visible = new Map(
      (data.catalog.candidatePacks ?? [])
        .filter((entry) => entry.customerSelectable && ['published', 'preview'].includes(entry.status))
        .map((entry) => [entry.packId + ':' + entry.version, entry])
    );
    const items = [];
    for (const pack of data.packs) {
      const key = pack.manifest.packId + ':' + pack.manifest.version;
      const entry = visible.get(key);
      if (!entry || entry.status !== pack.manifest.status || entry.title !== pack.manifest.title || entry.wordCount !== pack.manifest.wordCount) continue;
      const validation = await validateContentPack(pack);
      if (!validation.valid) continue;
      items.push({
        packId: pack.manifest.packId,
        version: pack.manifest.version,
        title: pack.manifest.title,
        familyId: pack.manifest.familyId,
        packType: pack.manifest.packType,
        status: pack.manifest.status,
        gradeBands: pack.manifest.target.gradeBands,
        wordCount: pack.manifest.wordCount,
        contentHash: pack.manifest.contentHash,
        progressScope: pack.manifest.progressScope
      });
    }
    return { items, nextCursor: null, requestId: request.id };
  });

  app.get<{ Params: { packId: string; version: string } }>(
    '/api/v1/content-packs/:packId/versions/:version/manifest',
    async (request, reply) => {
      const key = request.params.packId + ':' + request.params.version;
      const pack = data.packs.find((candidate) => candidate.manifest.packId + ':' + candidate.manifest.version === key);
      if (!pack) return reply.code(404).send({ code: 'CONTENT_PACK_NOT_FOUND', message: 'Content pack not found.', requestId: request.id, retryable: false });
      const entry = (data.catalog.candidatePacks ?? []).find((candidate) =>
        candidate.packId + ':' + candidate.version === key &&
        candidate.customerSelectable &&
        candidate.status === pack.manifest.status &&
        ['published', 'preview'].includes(candidate.status)
      );
      if (!entry) return reply.code(404).send({ code: 'CONTENT_PACK_NOT_FOUND', message: 'Content pack not found.', requestId: request.id, retryable: false });
      if (entry.title !== pack.manifest.title || entry.wordCount !== pack.manifest.wordCount) return reply.code(409).send({ code: 'CONTENT_MANIFEST_MISMATCH', message: 'Catalog metadata does not match the content manifest.', requestId: request.id, retryable: false });
      const validation = await validateContentPack(pack);
      if (!validation.valid) return reply.code(409).send({ code: 'CONTENT_HASH_MISMATCH', message: 'Content pack failed integrity validation.', requestId: request.id, retryable: false });
      return {
        packId: pack.manifest.packId,
        version: pack.manifest.version,
        schemaVersion: pack.schemaVersion,
        contentHash: pack.manifest.contentHash,
        assetManifestHash: pack.manifest.assetManifestHash,
        wordCount: pack.manifest.wordCount,
        unitRefs: pack.units.map((unit) => unit.unitId),
        resourceUris: { content: `/content-packs/${pack.manifest.packId}/${pack.manifest.version}/content-pack.json`, assets: `/content-packs/${pack.manifest.packId}/${pack.manifest.version}/assets/` },
        requestId: 'generated-by-fastify'
      };
    }
  );

  return app;
}

export async function loadDefaultApiData(): Promise<ApiData> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const ids = ['high-frequency-starter', 'theme-school-life', 'theme-nature-science'];
  const packs = await Promise.all(ids.map(async (id) => {
    const file = resolve(root, 'content-packs', id, '0.1.0', 'content-pack.json');
    return JSON.parse(await readFile(file, 'utf8')) as ContentPack;
  }));
  const catalogFile = resolve(root, 'docs/contracts/content-pack-catalog.candidate.v0.1.json');
  const catalog = JSON.parse(await readFile(catalogFile, 'utf8')) as ContentCatalog;
  return { packs, catalog };
}

if (process.env.WORDQUEST_API_AUTOSTART === '1') {
  const port = Number(process.env.PORT ?? 3000);
  void loadDefaultApiData()
    .then((data) => createApiServer(data).listen({ port, host: '0.0.0.0' }))
    .catch((error: unknown) => {
      process.stderr.write((error instanceof Error ? error.stack : String(error)) + '\n');
      process.exitCode = 1;
    });
}
