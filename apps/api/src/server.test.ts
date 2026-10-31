import { afterEach, describe, expect, it } from 'vitest';
import { createApiServer, loadDefaultApiData } from './server';

describe('WordQuest content API', () => {
  let app: ReturnType<typeof createApiServer> | undefined;
  afterEach(async () => { await app?.close(); app = undefined; });

  it('serves health status', async () => {
    const data = await loadDefaultApiData();
    app = createApiServer(data);
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('does not expose internal preview candidates to customers', async () => {
    const data = await loadDefaultApiData();
    app = createApiServer(data);
    const response = await app.inject({ method: 'GET', url: '/api/v1/content-packs' });
    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([]);
  });

  it('returns 404 for a non-customer-selectable candidate manifest', async () => {
    const data = await loadDefaultApiData();
    app = createApiServer(data);
    const response = await app.inject({ method: 'GET', url: '/api/v1/content-packs/high-frequency-starter/versions/0.1.0/manifest' });
    expect(response.statusCode).toBe(404);
  });

  it('returns a manifest only after catalog visibility and integrity checks pass', async () => {
    const data = await loadDefaultApiData();
    data.catalog.candidatePacks?.push({
      packId: 'high-frequency-starter', version: '0.1.0', familyId: 'high-frequency',
      title: 'Internal preview test', status: 'preview', customerSelectable: true,
      wordCount: 30, gradeBands: ['grade4', 'grade5', 'grade6'],
      contentPath: 'content-packs/high-frequency-starter/0.1.0/content-pack.json'
    });
    app = createApiServer(data);
    const response = await app.inject({ method: 'GET', url: '/api/v1/content-packs/high-frequency-starter/versions/0.1.0/manifest' });
    expect(response.statusCode).toBe(200);
    expect(response.json().packId).toBe('high-frequency-starter');
    expect(response.json().wordCount).toBe(30);
  });
});
