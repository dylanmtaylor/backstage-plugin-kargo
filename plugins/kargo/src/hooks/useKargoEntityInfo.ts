import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  KARGO_ANNOTATIONS,
  parseAnnotationList,
} from '@dylanmtaylor/backstage-plugin-kargo-common';

/**
 * The Kargo settings read from an entity's annotations.
 *
 * @public
 */
export interface KargoEntityInfo {
  /** The Kargo Project. Undefined when the entity has no project annotation. */
  project?: string;
  /** Stage names to show. Empty means every Stage in the Project. */
  stages: string[];
  /** Warehouse names to show. Empty means every Warehouse in the Project. */
  warehouses: string[];
  /** The configured Kargo instance name. Undefined means the default. */
  instance?: string;
}

/**
 * Read Kargo annotations from an entity.
 *
 * @public
 */
export function getKargoEntityInfo(entity: Entity): KargoEntityInfo {
  const annotations = entity.metadata.annotations ?? {};
  const project = annotations[KARGO_ANNOTATIONS.PROJECT]?.trim() || undefined;
  return {
    project,
    stages: parseAnnotationList(annotations[KARGO_ANNOTATIONS.STAGES]),
    warehouses: parseAnnotationList(annotations[KARGO_ANNOTATIONS.WAREHOUSES]),
    instance: annotations[KARGO_ANNOTATIONS.INSTANCE]?.trim() || undefined,
  };
}

/**
 * Report whether an entity has the Kargo project annotation.
 *
 * @public
 */
export function isKargoAvailable(entity: Entity): boolean {
  return Boolean(getKargoEntityInfo(entity).project);
}

/**
 * Read Kargo annotations from the entity in context.
 *
 * @public
 */
export function useKargoEntityInfo(): KargoEntityInfo {
  const { entity } = useEntity();
  return getKargoEntityInfo(entity);
}
