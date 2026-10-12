import {
  createApiFactory,
  createComponentExtension,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { KargoClient, kargoApiRef } from './api';
import { rootRouteRef } from './routes';

/**
 * The Kargo frontend plugin.
 *
 * @public
 */
export const kargoPlugin = createPlugin({
  id: 'kargo',
  apis: [
    createApiFactory({
      api: kargoApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new KargoClient({ discoveryApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

/**
 * A tab for an entity page that shows Kargo Stages, Warehouses, and
 * Promotions.
 *
 * @public
 */
export const EntityKargoContent = kargoPlugin.provide(
  createRoutableExtension({
    name: 'EntityKargoContent',
    component: () =>
      import('./components/KargoEntityContent').then(m => m.KargoEntityContent),
    mountPoint: rootRouteRef,
  }),
);

/**
 * A card that shows the Kargo Stages for an entity.
 *
 * @public
 */
export const EntityKargoStagesCard = kargoPlugin.provide(
  createComponentExtension({
    name: 'EntityKargoStagesCard',
    component: {
      lazy: () =>
        import('./components/KargoStagesCard').then(m => m.KargoStagesCard),
    },
  }),
);

/**
 * A card that shows recent Kargo Promotions for an entity.
 *
 * @public
 */
export const EntityKargoPromotionsCard = kargoPlugin.provide(
  createComponentExtension({
    name: 'EntityKargoPromotionsCard',
    component: {
      lazy: () =>
        import('./components/KargoPromotionsCard').then(
          m => m.KargoPromotionsCard,
        ),
    },
  }),
);

/**
 * A card that shows the Kargo Warehouses for an entity.
 *
 * @public
 */
export const EntityKargoWarehousesCard = kargoPlugin.provide(
  createComponentExtension({
    name: 'EntityKargoWarehousesCard',
    component: {
      lazy: () =>
        import('./components/KargoWarehousesCard').then(
          m => m.KargoWarehousesCard,
        ),
    },
  }),
);
