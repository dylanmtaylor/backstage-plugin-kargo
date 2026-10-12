import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';

// A minimal backend for local development of the Kargo plugin.
//
// Start it with `yarn start` in this package directory. Point it at a Kargo
// instance with environment variables:
//
//   KARGO_URL=https://localhost:31444 \
//   KARGO_ADMIN_PASSWORD=admin \
//   KARGO_SKIP_TLS_VERIFY=true \
//   yarn start
//
// Then try:
//
//   curl http://localhost:7007/api/kargo/instances
//   curl http://localhost:7007/api/kargo/projects
//   curl http://localhost:7007/api/kargo/projects/kargo-demo/stages

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());
backend.add(
  mockServices.rootConfig.factory({
    data: {
      kargo: {
        instances: [
          {
            name: 'local',
            url: process.env.KARGO_URL ?? 'https://localhost:31444',
            ...(process.env.KARGO_TOKEN
              ? { token: process.env.KARGO_TOKEN }
              : {
                  adminPassword: process.env.KARGO_ADMIN_PASSWORD ?? 'admin',
                }),
            skipTLSVerify: process.env.KARGO_SKIP_TLS_VERIFY === 'true',
          },
        ],
      },
    },
  }),
);

backend.add(import('../src'));

backend.start();
