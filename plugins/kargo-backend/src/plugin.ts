import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { createKargoService } from './services/KargoService';

/**
 * The Kargo backend plugin. It proxies read-only requests to one or more
 * Kargo API servers and keeps credentials on the backend.
 *
 * @public
 */
export const kargoPlugin = createBackendPlugin({
  pluginId: 'kargo',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        cache: coreServices.cache,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, config, cache, httpRouter }) {
        const kargoService = createKargoService({ config, logger, cache });
        httpRouter.use(await createRouter({ kargoService }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
