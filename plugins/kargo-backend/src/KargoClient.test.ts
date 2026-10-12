import { mockServices } from '@backstage/backend-test-utils';
import {
  AuthenticationError,
  NotAllowedError,
  NotFoundError,
  ServiceUnavailableError,
} from '@backstage/errors';
import { KargoClient } from './KargoClient';
import { KargoInstanceConfig } from './config';

type Call = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeJwt(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
    'base64url',
  );
  return `header.${payload}.signature`;
}

function createClient(options: {
  auth?: KargoInstanceConfig['auth'];
  responses: Array<Response | Error>;
  now?: () => number;
  skipTLSVerify?: boolean;
}) {
  const calls: Call[] = [];
  const queue = [...options.responses];
  const fetchImpl = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    const next = queue.shift();
    if (!next) {
      throw new Error(`Unexpected request: ${url}`);
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  }) as unknown as typeof fetch;

  const client = new KargoClient({
    instance: {
      name: 'test',
      url: 'https://kargo.example.com',
      uiUrl: 'https://kargo.example.com',
      auth: options.auth ?? { type: 'token', token: 'secret-token' },
      skipTLSVerify: options.skipTLSVerify ?? false,
    },
    logger: mockServices.logger.mock(),
    requestTimeoutMs: 1000,
    fetchImpl,
    now: options.now,
  });

  return { client, calls, fetchImpl };
}

function authHeader(call: Call): string | undefined {
  return (call.init.headers as Record<string, string>).Authorization;
}

describe('KargoClient', () => {
  describe('token auth', () => {
    it('sends the bearer token and parses project lists', async () => {
      const { client, calls } = createClient({
        responses: [
          jsonResponse({ items: [{ metadata: { name: 'demo' } }], total: 1 }),
        ],
      });

      const result = await client.listProjects({ filter: 'de', pageSize: 10 });

      expect(result).toEqual({
        items: [{ metadata: { name: 'demo' } }],
        total: 1,
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(
        'https://kargo.example.com/v1beta1/projects?filter=de&pageSize=10',
      );
      expect(authHeader(calls[0])).toBe('Bearer secret-token');
    });

    it('builds encoded paths for stages, promotions, and warehouses', async () => {
      const { client, calls } = createClient({
        responses: [
          jsonResponse({ items: [] }),
          jsonResponse({ metadata: { name: 'a b' } }),
          jsonResponse({ items: [] }),
          jsonResponse({ items: [] }),
          jsonResponse({ metadata: { name: 'wh' } }),
        ],
      });

      await client.listStages('proj');
      await client.getStage('proj', 'a b');
      await client.listPromotions('proj', { stage: 'prod' });
      await client.listWarehouses('proj');
      await client.getWarehouse('proj', 'wh');

      expect(calls.map(c => c.url)).toEqual([
        'https://kargo.example.com/v1beta1/projects/proj/stages',
        'https://kargo.example.com/v1beta1/projects/proj/stages/a%20b',
        'https://kargo.example.com/v1beta1/projects/proj/promotions?stage=prod',
        'https://kargo.example.com/v1beta1/projects/proj/warehouses',
        'https://kargo.example.com/v1beta1/projects/proj/warehouses/wh',
      ]);
    });

    it('flattens freight groups and repeats origins', async () => {
      const { client, calls } = createClient({
        responses: [
          jsonResponse({
            groups: {
              '': { items: [{ metadata: { name: 'f1' } }] },
              other: { items: [{ metadata: { name: 'f2' } }] },
            },
          }),
        ],
      });

      const freight = await client.queryFreight('proj', {
        stage: 'prod',
        origins: ['w1', 'w2'],
        orderBy: 'first_seen',
        reverse: true,
      });

      expect(freight.map(f => f.metadata.name)).toEqual(['f1', 'f2']);
      expect(calls[0].url).toBe(
        'https://kargo.example.com/v1beta1/projects/proj/freight?stage=prod&origins=w1&origins=w2&orderBy=first_seen&reverse=true',
      );
    });
  });

  describe('no auth', () => {
    it('omits the Authorization header', async () => {
      const { client, calls } = createClient({
        auth: { type: 'none' },
        responses: [jsonResponse({ items: [] })],
      });
      await client.listStages('proj');
      expect(authHeader(calls[0])).toBeUndefined();
    });
  });

  describe('admin password auth', () => {
    it('logs in once and reuses the ID token', async () => {
      let now = 1_000_000_000_000;
      const exp = Math.floor(now / 1000) + 3600;
      const { client, calls } = createClient({
        auth: { type: 'adminPassword', password: 'pw' },
        responses: [
          jsonResponse({ idToken: makeJwt(exp) }),
          jsonResponse({ items: [] }),
          jsonResponse({ items: [] }),
        ],
        now: () => now,
      });

      await client.listStages('proj');
      now += 1000;
      await client.listStages('proj');

      expect(calls).toHaveLength(3);
      expect(calls[0].url).toBe('https://kargo.example.com/v1beta1/login');
      expect(calls[0].init.method).toBe('POST');
      expect(authHeader(calls[0])).toBe('Bearer pw');
      expect(authHeader(calls[1])).toBe(`Bearer ${makeJwt(exp)}`);
      expect(authHeader(calls[2])).toBe(`Bearer ${makeJwt(exp)}`);
    });

    it('refreshes the token before it expires', async () => {
      let now = 1_000_000_000_000;
      const exp1 = Math.floor(now / 1000) + 120;
      const exp2 = exp1 + 3600;
      const { client, calls } = createClient({
        auth: { type: 'adminPassword', password: 'pw' },
        responses: [
          jsonResponse({ idToken: makeJwt(exp1) }),
          jsonResponse({ items: [] }),
          jsonResponse({ idToken: makeJwt(exp2) }),
          jsonResponse({ items: [] }),
        ],
        now: () => now,
      });

      await client.listStages('proj');
      // Move inside the 60 second refresh margin.
      now += 90_000;
      await client.listStages('proj');

      expect(calls.map(c => c.url)).toEqual([
        'https://kargo.example.com/v1beta1/login',
        'https://kargo.example.com/v1beta1/projects/proj/stages',
        'https://kargo.example.com/v1beta1/login',
        'https://kargo.example.com/v1beta1/projects/proj/stages',
      ]);
      expect(authHeader(calls[3])).toBe(`Bearer ${makeJwt(exp2)}`);
    });

    it('retries once with a fresh token after a 401', async () => {
      const now = 1_000_000_000_000;
      const exp = Math.floor(now / 1000) + 3600;
      const { client, calls } = createClient({
        auth: { type: 'adminPassword', password: 'pw' },
        responses: [
          jsonResponse({ idToken: makeJwt(exp) }),
          jsonResponse({ message: 'expired' }, 401),
          jsonResponse({ idToken: makeJwt(exp + 10) }),
          jsonResponse({ items: [{ metadata: { name: 's' } }] }),
        ],
        now: () => now,
      });

      const stages = await client.listStages('proj');

      expect(stages).toHaveLength(1);
      expect(calls).toHaveLength(4);
      expect(calls[2].url).toBe('https://kargo.example.com/v1beta1/login');
    });

    it('deduplicates concurrent logins', async () => {
      const now = 1_000_000_000_000;
      const exp = Math.floor(now / 1000) + 3600;
      const { client, calls } = createClient({
        auth: { type: 'adminPassword', password: 'pw' },
        responses: [
          jsonResponse({ idToken: makeJwt(exp) }),
          jsonResponse({ items: [] }),
          jsonResponse({ items: [] }),
        ],
        now: () => now,
      });

      await Promise.all([client.listStages('a'), client.listStages('b')]);

      expect(calls.filter(c => c.url.endsWith('/login'))).toHaveLength(1);
    });

    it('throws AuthenticationError when login fails', async () => {
      const { client } = createClient({
        auth: { type: 'adminPassword', password: 'bad' },
        responses: [jsonResponse({ message: 'invalid password' }, 401)],
      });
      await expect(client.listStages('proj')).rejects.toThrow(
        AuthenticationError,
      );
    });
  });

  describe('errors', () => {
    it('maps 401 to AuthenticationError', async () => {
      const { client } = createClient({ responses: [jsonResponse({}, 401)] });
      await expect(client.listStages('p')).rejects.toThrow(AuthenticationError);
    });

    it('maps 403 to NotAllowedError', async () => {
      const { client } = createClient({ responses: [jsonResponse({}, 403)] });
      await expect(client.listStages('p')).rejects.toThrow(NotAllowedError);
    });

    it('maps 404 to NotFoundError with detail', async () => {
      const { client } = createClient({
        responses: [jsonResponse({ message: 'stage not found' }, 404)],
      });
      await expect(client.getStage('p', 's')).rejects.toThrow(
        /404 for \/projects\/p\/stages\/s: stage not found/,
      );
      await expect(
        createClient({ responses: [jsonResponse({}, 404)] }).client.getStage(
          'p',
          's',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('maps 5xx to ServiceUnavailableError', async () => {
      const { client } = createClient({
        responses: [new Response('boom', { status: 502 })],
      });
      await expect(client.listStages('p')).rejects.toThrow(
        ServiceUnavailableError,
      );
    });

    it('wraps network failures', async () => {
      const { client } = createClient({
        responses: [new Error('ECONNREFUSED')],
      });
      await expect(client.listStages('p')).rejects.toThrow(
        /Request to Kargo instance "test" failed: ECONNREFUSED/,
      );
    });

    it('reports timeouts', async () => {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      const { client } = createClient({ responses: [abort] });
      await expect(client.listStages('p')).rejects.toThrow(
        /timed out after 1000ms/,
      );
    });
  });

  it('passes an undici dispatcher when TLS verification is skipped', async () => {
    const { client, calls } = createClient({
      skipTLSVerify: true,
      responses: [jsonResponse({ items: [] })],
    });
    await client.listStages('p');
    expect((calls[0].init as any).dispatcher).toBeDefined();
  });
});
