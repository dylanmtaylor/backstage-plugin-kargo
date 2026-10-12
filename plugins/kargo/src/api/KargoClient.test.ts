import { mockApis } from '@backstage/test-utils';
import { KargoClient } from './KargoClient';

describe('KargoClient', () => {
  const discoveryApi = mockApis.discovery({
    baseUrl: 'http://backstage.example.com',
  });

  function setup(body: unknown, status = 200) {
    const fetch = jest.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const client = new KargoClient({
      discoveryApi,
      fetchApi: { fetch: fetch as unknown as typeof globalThis.fetch },
    });
    return { client, fetch };
  }

  it('lists instances', async () => {
    const { client, fetch } = setup({
      items: [{ name: 'a', url: 'https://a' }],
    });
    await expect(client.listInstances()).resolves.toEqual([
      { name: 'a', url: 'https://a' },
    ]);
    expect(fetch.mock.calls[0][0]).toBe(
      'http://backstage.example.com/api/kargo/instances',
    );
  });

  it('builds project routes with encoded segments and instance', async () => {
    const { client, fetch } = setup({ items: [] });
    await client.listStages('my proj', { instance: 'prod' });
    expect(fetch.mock.calls[0][0]).toBe(
      'http://backstage.example.com/api/kargo/projects/my%20proj/stages?instance=prod',
    );
  });

  it('passes promotion stage filters', async () => {
    const { client, fetch } = setup({ items: [] });
    await client.listPromotions('demo', { stage: 'prod' });
    expect(fetch.mock.calls[0][0]).toBe(
      'http://backstage.example.com/api/kargo/projects/demo/promotions?stage=prod',
    );
  });

  it('repeats array query parameters for freight origins', async () => {
    const { client, fetch } = setup({ items: [] });
    await client.queryFreight('demo', {
      origins: ['a', 'b'],
      orderBy: 'tag',
      reverse: true,
    });
    expect(fetch.mock.calls[0][0]).toBe(
      'http://backstage.example.com/api/kargo/projects/demo/freight?origins=a&origins=b&orderBy=tag&reverse=true',
    );
  });

  it('fetches single resources', async () => {
    const { client, fetch } = setup({ metadata: { name: 'w' } });
    await client.getWarehouse('demo', 'w');
    await client.getStage('demo', 's');
    await client.getPromotion('demo', 'p');
    await client.getFreight('demo', 'f');
    await client.getProject('demo');
    expect(fetch.mock.calls.map(c => c[0])).toEqual([
      'http://backstage.example.com/api/kargo/projects/demo/warehouses/w',
      'http://backstage.example.com/api/kargo/projects/demo/stages/s',
      'http://backstage.example.com/api/kargo/projects/demo/promotions/p',
      'http://backstage.example.com/api/kargo/projects/demo/freight/f',
      'http://backstage.example.com/api/kargo/projects/demo',
    ]);
  });

  it('throws a ResponseError on failure', async () => {
    const { client } = setup(
      { error: { name: 'NotFoundError', message: 'missing' } },
      404,
    );
    await expect(client.getStage('demo', 'nope')).rejects.toThrow(
      /Request failed with 404/,
    );
  });
});
