import { createApiRef } from '@backstage/core-plugin-api';
import {
  KargoFreight,
  KargoInstanceInfo,
  KargoProject,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';

/**
 * Options shared by every request. The `instance` selects a configured Kargo
 * instance by name. The backend uses the first instance when it is absent.
 *
 * @public
 */
export interface KargoRequestOptions {
  instance?: string;
}

/**
 * Options for {@link KargoApi.queryFreight}.
 *
 * @public
 */
export interface KargoQueryFreightOptions extends KargoRequestOptions {
  stage?: string;
  origins?: string[];
  groupBy?: 'image_repo' | 'git_repo' | 'chart_repo';
  orderBy?: 'first_seen' | 'tag';
  reverse?: boolean;
}

/**
 * The frontend API for the Kargo plugin. Every call goes through the Kargo
 * backend plugin.
 *
 * @public
 */
export interface KargoApi {
  listInstances(): Promise<KargoInstanceInfo[]>;
  listProjects(
    options?: KargoRequestOptions & {
      filter?: string;
      pageSize?: number;
      page?: number;
    },
  ): Promise<{ items: KargoProject[]; total: number }>;
  getProject(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoProject>;
  listStages(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoStage[]>;
  getStage(
    project: string,
    stage: string,
    options?: KargoRequestOptions,
  ): Promise<KargoStage>;
  listPromotions(
    project: string,
    options?: KargoRequestOptions & { stage?: string },
  ): Promise<KargoPromotion[]>;
  getPromotion(
    project: string,
    promotion: string,
    options?: KargoRequestOptions,
  ): Promise<KargoPromotion>;
  queryFreight(
    project: string,
    options?: KargoQueryFreightOptions,
  ): Promise<KargoFreight[]>;
  getFreight(
    project: string,
    nameOrAlias: string,
    options?: KargoRequestOptions,
  ): Promise<KargoFreight>;
  listWarehouses(
    project: string,
    options?: KargoRequestOptions,
  ): Promise<KargoWarehouse[]>;
  getWarehouse(
    project: string,
    warehouse: string,
    options?: KargoRequestOptions,
  ): Promise<KargoWarehouse>;
}

/**
 * The API reference for {@link KargoApi}.
 *
 * @public
 */
export const kargoApiRef = createApiRef<KargoApi>({
  id: 'plugin.kargo.service',
});
