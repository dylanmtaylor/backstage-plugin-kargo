/**
 * The Kargo frontend plugin for Backstage.
 *
 * @packageDocumentation
 */

export {
  kargoPlugin,
  EntityKargoContent,
  EntityKargoStagesCard,
  EntityKargoPromotionsCard,
  EntityKargoWarehousesCard,
} from './plugin';
export { rootRouteRef } from './routes';
export * from './api';
export * from './hooks';
export * from './components';
export {
  KARGO_ANNOTATIONS,
  KARGO_PROJECT_ANNOTATION,
  KARGO_STAGES_ANNOTATION,
  KARGO_WAREHOUSES_ANNOTATION,
  KARGO_INSTANCE_ANNOTATION,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
