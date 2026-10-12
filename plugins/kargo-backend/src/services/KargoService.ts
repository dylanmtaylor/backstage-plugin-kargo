import {
  CacheService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import {
  KargoFreight,
  KargoInstanceInfo,
  KargoProject,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { KargoClient, QueryFreightOptions } from '../KargoClient';
import { readKargoConfig } from '../config';

/**
 * The service that the router uses to talk to Kargo.
 *
 * @public
 */
export interface KargoService {
  listInstances(): KargoInstanceInfo[];
  listProjects(
    instance: string | undefined,
    options?: { filter?: string; pageSize?: number; page?: number },
  ): Promise<{ items: KargoProject[]; total: number }>;
  getProject(
    instance: string | undefined,
    project: string,
  ): Promise<KargoProject>;
  listStages(
    instance: string | undefined,
    project: string,
  ): Promise<KargoStage[]>;
  getStage(
    instance: string | undefined,
    project: string,
    stage: string,
  ): Promise<KargoStage>;
  listPromotions(
    instance: string | undefined,
    project: string,
    options?: { stage?: string },
  ): Promise<KargoPromotion[]>;
  getPromotion(
    instance: string | undefined,
    project: string,
    promotion: string,
  ): Promise<KargoPromotion>;
  queryFreight(
    instance: string | undefined,
    project: string,
    options?: QueryFreightOptions,
  ): Promise<KargoFreight[]>;
  getFreight(
    instance: string | undefined,
    project: string,
    nameOrAlias: string,
  ): Promise<KargoFreight>;
  listWarehouses(
    instance: string | undefined,
    project: string,
  ): Promise<KargoWarehouse[]>;
  getWarehouse(
    instance: string | undefined,
    project: string,
    warehouse: string,
  ): Promise<KargoWarehouse>;
}

/**
 * Options for {@link createKargoService}.
 *
 * @public
 */
export interface KargoServiceOptions {
  config: RootConfigService;
  logger: LoggerService;
  cache?: CacheService;
  /** Override for tests. */
  clientFactory?: (
    instance: ReturnType<typeof readKargoConfig>['instances'][number],
  ) => KargoClient;
}

/**
 * Create the {@link KargoService}.
 *
 * @public
 */
export function createKargoService(options: KargoServiceOptions): KargoService {
  const { logger } = options;
  const pluginConfig = readKargoConfig(options.config);

  if (pluginConfig.instances.length === 0) {
    logger.warn(
      'No Kargo instances are configured. Set kargo.instances in app-config.',
    );
  }

  const clients = new Map<string, KargoClient>();
  for (const instance of pluginConfig.instances) {
    const client =
      options.clientFactory?.(instance) ??
      new KargoClient({
        instance,
        logger,
        requestTimeoutMs: pluginConfig.requestTimeoutMs,
      });
    clients.set(instance.name, client);
    logger.info(
      `Registered Kargo instance "${instance.name}" at ${instance.url}`,
    );
  }

  const defaultInstance = pluginConfig.instances[0]?.name;
  const ttlMs = pluginConfig.cacheTtlSeconds * 1000;
  const cache =
    options.cache && ttlMs > 0
      ? options.cache.withOptions({ defaultTtl: ttlMs })
      : undefined;

  function resolveClient(instanceName?: string): KargoClient {
    const name = instanceName ?? defaultInstance;
    if (!name) {
      throw new NotFoundError('No Kargo instances are configured');
    }
    const client = clients.get(name);
    if (!client) {
      throw new NotFoundError(`Unknown Kargo instance "${name}"`);
    }
    return client;
  }

  async function cached<T>(
    cacheKey: string,
    load: () => Promise<T>,
  ): Promise<T> {
    if (!cache) {
      return load();
    }
    const hit = (await cache.get(cacheKey)) as T | undefined;
    if (hit !== undefined) {
      return hit;
    }
    const value = await load();
    await cache.set(cacheKey, value as any);
    return value;
  }

  function key(client: KargoClient, ...parts: unknown[]): string {
    return [
      'kargo',
      client.name,
      ...parts.map(part => JSON.stringify(part)),
    ].join(':');
  }

  return {
    listInstances() {
      return pluginConfig.instances.map(instance => ({
        name: instance.name,
        url: instance.uiUrl,
      }));
    },

    async listProjects(instance, listOptions) {
      const client = resolveClient(instance);
      return cached(key(client, 'projects', listOptions ?? {}), () =>
        client.listProjects(listOptions),
      );
    },

    async getProject(instance, project) {
      const client = resolveClient(instance);
      return cached(key(client, 'project', project), () =>
        client.getProject(project),
      );
    },

    async listStages(instance, project) {
      const client = resolveClient(instance);
      return cached(key(client, 'stages', project), () =>
        client.listStages(project),
      );
    },

    async getStage(instance, project, stage) {
      const client = resolveClient(instance);
      return cached(key(client, 'stage', project, stage), () =>
        client.getStage(project, stage),
      );
    },

    async listPromotions(instance, project, listOptions) {
      const client = resolveClient(instance);
      return cached(key(client, 'promotions', project, listOptions ?? {}), () =>
        client.listPromotions(project, listOptions),
      );
    },

    async getPromotion(instance, project, promotion) {
      const client = resolveClient(instance);
      return cached(key(client, 'promotion', project, promotion), () =>
        client.getPromotion(project, promotion),
      );
    },

    async queryFreight(instance, project, queryOptions) {
      const client = resolveClient(instance);
      return cached(key(client, 'freight', project, queryOptions ?? {}), () =>
        client.queryFreight(project, queryOptions),
      );
    },

    async getFreight(instance, project, nameOrAlias) {
      const client = resolveClient(instance);
      return cached(key(client, 'freightItem', project, nameOrAlias), () =>
        client.getFreight(project, nameOrAlias),
      );
    },

    async listWarehouses(instance, project) {
      const client = resolveClient(instance);
      return cached(key(client, 'warehouses', project), () =>
        client.listWarehouses(project),
      );
    },

    async getWarehouse(instance, project, warehouse) {
      const client = resolveClient(instance);
      return cached(key(client, 'warehouse', project, warehouse), () =>
        client.getWarehouse(project, warehouse),
      );
    },
  };
}
