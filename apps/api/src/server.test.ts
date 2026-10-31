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
    const candidate = data.catalog.candidatePacks?.find((entry) => entry.packId === 'high-frequency-starter' && entry.version === '0.1.0');
    if (!candidate) throw new Error('Expected internal candidate pack in catalog.');
    candidate.customerSelectable = true;
    app = createApiServer(data);
    const response = await app.inject({ method: 'GET', url: '/api/v1/content-packs/high-frequency-starter/versions/0.1.0/manifest' });
    expect(response.statusCode).toBe(200);
    expect(response.json().packId).toBe('high-frequency-starter');
    expect(response.json().wordCount).toBe(30);
  });
});
