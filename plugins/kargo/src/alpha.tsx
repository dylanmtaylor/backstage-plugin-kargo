import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import {
  EntityCardBlueprint,
  EntityContentBlueprint,
} from '@backstage/plugin-catalog-react/alpha';
import { convertLegacyRouteRef } from '@backstage/core-compat-api';
import { KARGO_ANNOTATIONS } from '@dylanmtaylor/backstage-plugin-kargo-common';
import { KargoClient, kargoApiRef } from './api';
import { rootRouteRef } from './routes';

/**
 * The entity filter that selects entities with the Kargo project annotation.
 */
const kargoEntityFilter = `has(metadata.annotations.${JSON.stringify(
  KARGO_ANNOTATIONS.PROJECT,
)})`;

/**
 * The Kargo API extension.
 *
 * @alpha
 */
export const kargoApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: kargoApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new KargoClient({ discoveryApi, fetchApi }),
    }),
});

/**
 * The Kargo Stages card for entity overview pages.
 *
 * @alpha
 */
export const kargoStagesEntityCard = EntityCardBlueprint.make({
  name: 'stages',
  params: {
    filter: kargoEntityFilter,
    type: 'content',
    loader: () =>
      import('./components/KargoStagesCard').then(m => <m.KargoStagesCard />),
  },
});

/**
 * The Kargo Promotions card for entity overview pages.
 *
 * @alpha
 */
export const kargoPromotionsEntityCard = EntityCardBlueprint.make({
  name: 'promotions',
  params: {
    filter: kargoEntityFilter,
    type: 'content',
    loader: () =>
      import('./components/KargoPromotionsCard').then(m => (
        <m.KargoPromotionsCard />
      )),
  },
});

/**
 * The Kargo Warehouses card for entity overview pages.
 *
 * @alpha
 */
export const kargoWarehousesEntityCard = EntityCardBlueprint.make({
  name: 'warehouses',
  params: {
    filter: kargoEntityFilter,
    type: 'content',
    loader: () =>
      import('./components/KargoWarehousesCard').then(m => (
        <m.KargoWarehousesCard />
      )),
  },
});

/**
 * The Kargo tab for entity pages.
 *
 * @alpha
 */
export const kargoEntityContent = EntityContentBlueprint.make({
  name: 'kargo',
  params: {
    path: '/kargo',
    title: 'Kargo',
    group: 'deployment',
    filter: kargoEntityFilter,
    routeRef: convertLegacyRouteRef(rootRouteRef),
    loader: () =>
      import('./components/KargoEntityContent').then(m => (
        <m.KargoEntityContent />
      )),
  },
});

/**
 * The Kargo plugin for the new Backstage frontend system.
 *
 * @alpha
 */
export default createFrontendPlugin({
  pluginId: 'kargo',
  info: { packageJson: () => import('../package.json') },
  routes: {
    root: convertLegacyRouteRef(rootRouteRef),
  },
  extensions: [
    kargoApi,
    kargoStagesEntityCard,
    kargoPromotionsEntityCard,
    kargoWarehousesEntityCard,
    kargoEntityContent,
  ],
});
