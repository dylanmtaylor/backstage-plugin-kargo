import { CacheService } from '@backstage/backend-plugin-api';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';
import { NotFoundError } from '@backstage/errors';
import { KargoClient } from '../KargoClient';
import { createKargoService } from './KargoService';

function memoryCache(): CacheService {
  const store = new Map<string, unknown>();
  const cache: CacheService = {
    async get(key) {
      return store.get(key) as any;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    withOptions() {
      return cache;
    },
  };
  return cache;
}

function fakeClient(name: string): jest.Mocked<KargoClient> {
  return {
    name,
    uiUrl: `https://${name}`,
    listProjects: jest.fn(),
    getProject: jest.fn(),
    listStages: jest.fn(),
    getStage: jest.fn(),
    listPromotions: jest.fn(),
    getPromotion: jest.fn(),
    queryFreight: jest.fn(),
    getFreight: jest.fn(),
    listWarehouses: jest.fn(),
    getWarehouse: jest.fn(),
  } as unknown as jest.Mocked<KargoClient>;
}

describe('createKargoService', () => {
  const config = new ConfigReader({
    kargo: {
      instances: [
        { name: 'one', url: 'https://one', uiUrl: 'https://one-ui' },
        { name: 'two', url: 'https://two' },
      ],
    },
  });

  it('lists instances without credentials', () => {
    const service = createKargoService({
      config: new ConfigReader({
        kargo: {
          instances: [{ name: 'one', url: 'https://one', token: 'secret' }],
        },
      }),
      logger: mockServices.logger.mock(),
    });
    expect(service.listInstances()).toEqual([
      { name: 'one', url: 'https://one' },
    ]);
    expect(JSON.stringify(service.listInstances())).not.toContain('secret');
  });

  it('uses the first instance by default and resolves by name', async () => {
    const clients = { one: fakeClient('one'), two: fakeClient('two') };
    const service = createKargoService({
      config,
      logger: mockServices.logger.mock(),
      clientFactory: instance => clients[instance.name as 'one' | 'two'],
    });
    clients.one.listStages.mockResolvedValue([]);
    clients.two.listStages.mockResolvedValue([{ metadata: { name: 's' } }]);

    await expect(service.listStages(undefined, 'p')).resolves.toEqual([]);
    await expect(service.listStages('two', 'p')).resolves.toHaveLength(1);
    await expect(service.listStages('three', 'p')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('throws when no instances are configured', async () => {
    const service = createKargoService({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
    });
    await expect(service.listStages(undefined, 'p')).rejects.toThrow(
      'No Kargo instances are configured',
    );
  });

  it('caches responses when a cache service is present', async () => {
    const client = fakeClient('one');
    client.listStages.mockResolvedValue([{ metadata: { name: 's' } }]);
    const service = createKargoService({
      config: new ConfigReader({
        kargo: {
          cacheTtlSeconds: 30,
          instances: [{ name: 'one', url: 'https://one' }],
        },
      }),
      logger: mockServices.logger.mock(),
      cache: memoryCache(),
      clientFactory: () => client,
    });

    await service.listStages(undefined, 'p');
    await service.listStages(undefined, 'p');
    await service.listStages(undefined, 'other');

    expect(client.listStages).toHaveBeenCalledTimes(2);
  });

  it('skips the cache when the TTL is zero', async () => {
    const client = fakeClient('one');
    client.listStages.mockResolvedValue([]);
    const service = createKargoService({
      config: new ConfigReader({
        kargo: {
          cacheTtlSeconds: 0,
          instances: [{ name: 'one', url: 'https://one' }],
        },
      }),
      logger: mockServices.logger.mock(),
      cache: memoryCache(),
      clientFactory: () => client,
    });

    await service.listStages(undefined, 'p');
    await service.listStages(undefined, 'p');

    expect(client.listStages).toHaveBeenCalledTimes(2);
  });

  it('delegates every read to the client', async () => {
    const client = fakeClient('one');
    const service = createKargoService({
      config,
      logger: mockServices.logger.mock(),
      clientFactory: () => client,
    });
    client.listProjects.mockResolvedValue({ items: [], total: 0 });
    client.getProject.mockResolvedValue({ metadata: { name: 'p' } });
    client.getStage.mockResolvedValue({ metadata: { name: 's' } });
    client.listPromotions.mockResolvedValue([]);
    client.getPromotion.mockResolvedValue({
      metadata: { name: 'pr' },
      spec: { stage: 's', freight: 'f' },
    });
    client.queryFreight.mockResolvedValue([]);
    client.getFreight.mockResolvedValue({ metadata: { name: 'f' } });
    client.listWarehouses.mockResolvedValue([]);
    client.getWarehouse.mockResolvedValue({ metadata: { name: 'w' } });

    await service.listProjects(undefined, { filter: 'x' });
    await service.getProject(undefined, 'p');
    await service.getStage(undefined, 'p', 's');
    await service.listPromotions(undefined, 'p', { stage: 's' });
    await service.getPromotion(undefined, 'p', 'pr');
    await service.queryFreight(undefined, 'p', { stage: 's' });
    await service.getFreight(undefined, 'p', 'f');
    await service.listWarehouses(undefined, 'p');
    await service.getWarehouse(undefined, 'p', 'w');

    expect(client.listProjects).toHaveBeenCalledWith({ filter: 'x' });
    expect(client.getProject).toHaveBeenCalledWith('p');
    expect(client.getStage).toHaveBeenCalledWith('p', 's');
    expect(client.listPromotions).toHaveBeenCalledWith('p', { stage: 's' });
    expect(client.getPromotion).toHaveBeenCalledWith('p', 'pr');
    expect(client.queryFreight).toHaveBeenCalledWith('p', { stage: 's' });
    expect(client.getFreight).toHaveBeenCalledWith('p', 'f');
    expect(client.listWarehouses).toHaveBeenCalledWith('p');
    expect(client.getWarehouse).toHaveBeenCalledWith('p', 'w');
  });
});
