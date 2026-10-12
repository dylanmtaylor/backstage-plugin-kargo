import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import {
  KargoFreight,
  KargoInstanceInfo,
  KargoProject,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import {
  KargoApi,
  KargoQueryFreightOptions,
  KargoRequestOptions,
} from './KargoApi';

/**
 * Options for {@link KargoClient}.
 *
 * @public
 */
export interface KargoClientOptions {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
}

type QueryValue = string | number | boolean | string[] | undefined;

/**
 * The default {@link KargoApi} implementation. It calls the Kargo backend
 * plugin through the Backstage discovery and fetch APIs.
 *
 * @public
 */
export class KargoClient implements KargoApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: KargoClientOptions) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async listInstances(): Promise<KargoInstanceInfo[]> {
    const response = await this.get<{ items: KargoInstanceInfo[] }>(
      '/instances',
    );
    return response.items;
  }

  async listProjects(
    options?: KargoRequestOptions & {
      filter?: string;
      pageSize?: number;
      page?: number;
    },
  ): Promise<{ items: KargoProject[]; total: number }> {
    return this.get('/projects', {
      instance: options?.instance,
      filter: options?.filter,
      pageSize: options?.pageSize,
      page: options?.page,
    });
  }

  async getProject(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoProject> {
    return this.get(`/projects/${enc(project)}`, {
      instance: options?.instance,
    });
  }

  async listStages(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoStage[]> {
    const response = await this.get<{ items: KargoStage[] }>(
      `/projects/${enc(project)}/stages`,
      { instance: options?.instance },
    );
    return response.items;
  }

  async getStage(
    project: string,
    stage: string,
    options?: KargoRequestOptions,
  ): Promise<KargoStage> {
    return this.get(`/projects/${enc(project)}/stages/${enc(stage)}`, {
      instance: options?.instance,
    });
  }

  async listPromotions(
    project: string,
    options?: KargoRequestOptions & { stage?: string },
  ): Promise<KargoPromotion[]> {
    const response = await this.get<{ items: KargoPromotion[] }>(
      `/projects/${enc(project)}/promotions`,
      { instance: options?.instance, stage: options?.stage },
    );
    return response.items;
  }

  async getPromotion(
    project: string,
    promotion: string,
    options?: KargoRequestOptions,
  ): Promise<KargoPromotion> {
    return this.get(`/projects/${enc(project)}/promotions/${enc(promotion)}`, {
      instance: options?.instance,
    });
  }

  async queryFreight(
    project: string,
    options?: KargoQueryFreightOptions,
  ): Promise<KargoFreight[]> {
    const response = await this.get<{ items: KargoFreight[] }>(
      `/projects/${enc(project)}/freight`,
      {
        instance: options?.instance,
        stage: options?.stage,
        origins: options?.origins,
        groupBy: options?.groupBy,
        orderBy: options?.orderBy,
        reverse: options?.reverse,
      },
    );
    return response.items;
  }

  async getFreight(
    project: string,
    nameOrAlias: string,
    options?: KargoRequestOptions,
  ): Promise<KargoFreight> {
    return this.get(`/projects/${enc(project)}/freight/${enc(nameOrAlias)}`, {
      instance: options?.instance,
    });
  }

  async listWarehouses(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoWarehouse[]> {
    const response = await this.get<{ items: KargoWarehouse[] }>(
      `/projects/${enc(project)}/warehouses`,
      { instance: options?.instance },
    );
    return response.items;
  }

  async getWarehouse(
    project: string,
    warehouse: string,
    options?: KargoRequestOptions,
  ): Promise<KargoWarehouse> {
    return this.get(`/projects/${enc(project)}/warehouses/${enc(warehouse)}`, {
      instance: options?.instance,
    });
  }

  private async get<T>(
    path: string,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kargo');
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      } else {
        params.set(key, String(value));
      }
    }
    const search = params.toString();
    const url = `${baseUrl}${path}${search ? `?${search}` : ''}`;
    const response = await this.fetchApi.fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }
    return (await response.json()) as T;
  }
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}
