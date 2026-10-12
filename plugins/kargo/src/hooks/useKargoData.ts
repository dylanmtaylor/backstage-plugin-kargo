import { useApi } from '@backstage/core-plugin-api';
import {
  KargoInstanceInfo,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { useCallback, useEffect, useMemo } from 'react';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';
import { kargoApiRef } from '../api';
import { KargoEntityInfo } from './useKargoEntityInfo';

/**
 * The default polling interval, in milliseconds, for data hooks.
 */
export const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

/**
 * The shared result shape for Kargo data hooks.
 *
 * @public
 */
export interface KargoAsyncResult<T> {
  value?: T;
  loading: boolean;
  error?: Error;
  retry: () => void;
}

function usePolling(retry: () => void, intervalMs: number | undefined) {
  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) {
      return undefined;
    }
    const timer = setInterval(retry, intervalMs);
    return () => clearInterval(timer);
  }, [retry, intervalMs]);
}

function filterByName<T extends { metadata: { name: string } }>(
  items: T[],
  names: string[],
): T[] {
  if (names.length === 0) {
    return items;
  }
  const wanted = new Set(names);
  return items.filter(item => wanted.has(item.metadata.name));
}

function sortByCreation<T extends { metadata: { creationTimestamp?: string } }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const left = a.metadata.creationTimestamp ?? '';
    const right = b.metadata.creationTimestamp ?? '';
    return right.localeCompare(left);
  });
}

/**
 * Load the Stages for an entity. Stages are filtered by the entity's stage
 * annotation when it is set.
 *
 * @public
 */
export function useKargoStages(
  info: KargoEntityInfo,
  options?: { refreshIntervalMs?: number },
): KargoAsyncResult<KargoStage[]> {
  const api = useApi(kargoApiRef);
  const { project, instance } = info;
  const stageKey = info.stages.join(',');

  const state = useAsyncRetry(async () => {
    if (!project) {
      return [];
    }
    const stages = await api.listStages(project, { instance });
    return filterByName(stages, stageKey ? stageKey.split(',') : []);
  }, [api, project, instance, stageKey]);

  const retry = useCallback(() => state.retry(), [state]);
  usePolling(retry, options?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);

  return {
    value: state.value,
    loading: state.loading,
    error: state.error,
    retry,
  };
}

/**
 * Load the Promotions for an entity. When the entity names Stages, only
 * Promotions for those Stages are returned. Promotions are sorted newest
 * first.
 *
 * @public
 */
export function useKargoPromotions(
  info: KargoEntityInfo,
  options?: { refreshIntervalMs?: number; limit?: number },
): KargoAsyncResult<KargoPromotion[]> {
  const api = useApi(kargoApiRef);
  const { project, instance } = info;
  const stageKey = info.stages.join(',');
  const limit = options?.limit;

  const state = useAsyncRetry(async () => {
    if (!project) {
      return [];
    }
    const stages = stageKey ? stageKey.split(',') : [];
    let promotions: KargoPromotion[];
    if (stages.length === 1) {
      promotions = await api.listPromotions(project, {
        instance,
        stage: stages[0],
      });
    } else {
      promotions = await api.listPromotions(project, { instance });
      if (stages.length > 1) {
        const wanted = new Set(stages);
        promotions = promotions.filter(p => wanted.has(p.spec.stage));
      }
    }
    const sorted = sortByCreation(promotions);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [api, project, instance, stageKey, limit]);

  const retry = useCallback(() => state.retry(), [state]);
  usePolling(retry, options?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);

  return {
    value: state.value,
    loading: state.loading,
    error: state.error,
    retry,
  };
}

/**
 * Load the Warehouses for an entity. Warehouses are filtered by the entity's
 * warehouse annotation when it is set.
 *
 * @public
 */
export function useKargoWarehouses(
  info: KargoEntityInfo,
  options?: { refreshIntervalMs?: number },
): KargoAsyncResult<KargoWarehouse[]> {
  const api = useApi(kargoApiRef);
  const { project, instance } = info;
  const warehouseKey = info.warehouses.join(',');

  const state = useAsyncRetry(async () => {
    if (!project) {
      return [];
    }
    const warehouses = await api.listWarehouses(project, { instance });
    return filterByName(
      warehouses,
      warehouseKey ? warehouseKey.split(',') : [],
    );
  }, [api, project, instance, warehouseKey]);

  const retry = useCallback(() => state.retry(), [state]);
  usePolling(retry, options?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);

  return {
    value: state.value,
    loading: state.loading,
    error: state.error,
    retry,
  };
}

/**
 * Resolve the Kargo instance that an entity uses. Returns the matching
 * configured instance, or the first instance when the entity names none.
 *
 * @public
 */
export function useKargoInstance(
  info: KargoEntityInfo,
): KargoAsyncResult<KargoInstanceInfo | undefined> {
  const api = useApi(kargoApiRef);
  const state = useAsyncRetry(() => api.listInstances(), [api]);
  const retry = useCallback(() => state.retry(), [state]);

  const value = useMemo(() => {
    if (!state.value) {
      return undefined;
    }
    if (info.instance) {
      return state.value.find(i => i.name === info.instance);
    }
    return state.value[0];
  }, [state.value, info.instance]);

  return { value, loading: state.loading, error: state.error, retry };
}
