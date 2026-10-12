# Backstage plugin for Kargo

[![CI](https://github.com/dylanmtaylor/backstage-plugin-kargo/actions/workflows/ci.yml/badge.svg)](https://github.com/dylanmtaylor/backstage-plugin-kargo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

A set of [Backstage](https://backstage.io) plugins for [Kargo](https://kargo.io), the GitOps promotion engine from Akuity. The plugins show Kargo Stages, Warehouses, Freight, and Promotions on Backstage entity pages and link to the Kargo UI.

| Package                                                                 | Description                                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`@dylanmtaylor/backstage-plugin-kargo`](plugins/kargo)                 | Frontend plugin. Entity cards and an entity tab.                           |
| [`@dylanmtaylor/backstage-plugin-kargo-backend`](plugins/kargo-backend) | Backend plugin. Proxies read-only requests to Kargo and holds credentials. |
| [`@dylanmtaylor/backstage-plugin-kargo-common`](plugins/kargo-common)   | Shared types, annotation constants, and helpers.                           |

## Features

- Stage table with health, current Freight, last Promotion, latest verification, and auto-promotion state.
- Promotion history table with phase, Freight, and timing.
- Warehouse table with readiness, subscriptions, interval, and last Freight.
- Deep links to the Project, Stage, Warehouse, Promotion, and Freight pages in the Kargo UI.
- Support for more than one Kargo instance.
- Bearer token or admin password authentication. The backend refreshes admin tokens before they expire.
- Response cache that uses the Backstage core cache service.
- Support for the legacy frontend system and the new frontend system.
- Read-only. The plugins never promote, approve, abort, or delete anything.

## Compatibility

| Component | Version                            |
| --------- | ---------------------------------- |
| Kargo     | 1.9 or later (REST API `/v1beta1`) |
| Backstage | 1.50 or later                      |
| Node.js   | 22 or 24                           |

## Installation

### 1. Install the packages

```sh
yarn --cwd packages/app add @dylanmtaylor/backstage-plugin-kargo
yarn --cwd packages/backend add @dylanmtaylor/backstage-plugin-kargo-backend
```

### 2. Register the backend plugin

```ts
// packages/backend/src/index.ts
backend.add(import('@dylanmtaylor/backstage-plugin-kargo-backend'));
```

### 3. Configure Kargo instances

```yaml
# app-config.yaml
kargo:
  instances:
    - name: production
      url: https://kargo.example.com
      token: ${KARGO_TOKEN}
    - name: development
      url: https://kargo-dev.example.com
      # Optional. Use when the UI is served from a different URL than the API.
      uiUrl: https://kargo-dev-ui.example.com
      adminPassword: ${KARGO_DEV_ADMIN_PASSWORD}
      # Development only.
      skipTLSVerify: true
  # Optional. Default: 10. Set to 0 to disable the cache.
  cacheTtlSeconds: 10
  # Optional. Default: 15000.
  requestTimeoutMs: 15000
```

Set only one of `token` or `adminPassword` per instance. See [Authentication](#authentication).

### 4. Add the frontend

#### New frontend system

The plugin exports a `@backstage/FrontendPlugin` at `@dylanmtaylor/backstage-plugin-kargo/alpha`. Apps that use `packages: all` discovery pick it up automatically. Otherwise, add it to the feature list:

```tsx
// packages/app/src/App.tsx
import kargoPlugin from '@dylanmtaylor/backstage-plugin-kargo/alpha';

export default createApp({
  features: [kargoPlugin /* ... */],
});
```

The plugin adds a `Kargo` tab and three entity cards to every entity that has the `kargo.akuity.io/project` annotation.

#### Legacy frontend system

```tsx
// packages/app/src/components/catalog/EntityPage.tsx
import {
  EntityKargoContent,
  EntityKargoStagesCard,
  EntityKargoPromotionsCard,
  isKargoAvailable,
} from '@dylanmtaylor/backstage-plugin-kargo';

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {/* ... */}
    <EntitySwitch>
      <EntitySwitch.Case if={isKargoAvailable}>
        <Grid item md={12}>
          <EntityKargoStagesCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </Grid>
);

const serviceEntityPage = (
  <EntityLayout>
    {/* ... */}
    <EntityLayout.Route if={isKargoAvailable} path="/kargo" title="Kargo">
      <EntityKargoContent />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### 5. Annotate entities

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: guestbook
  annotations:
    # Required. The Kargo Project.
    kargo.akuity.io/project: kargo-demo
    # Optional. Show only these Stages. Default: every Stage in the Project.
    kargo.akuity.io/stages: test,uat,prod
    # Optional. Show only these Warehouses. Default: every Warehouse.
    kargo.akuity.io/warehouses: main
    # Optional. Use a named instance. Default: the first configured instance.
    kargo.akuity.io/instance: production
```

## Authentication

The backend holds Kargo credentials. The frontend never sees them.

### Bearer token (recommended)

Set `token` to a Kargo API token or an OIDC ID token that Kargo accepts. Create a Project-level Kargo Role with read-only permissions and mint a token for it with the `kargo` CLI:

```sh
kargo create role backstage-reader --project kargo-demo
for resource in projects stages promotions freights warehouses; do
  kargo grant --role backstage-reader --project kargo-demo \
    --verb get --verb list --resource-type "$resource"
done
kargo create token --project kargo-demo --role backstage-reader backstage
```

Store the printed token as a secret. A Project-level token can read only its own Project. Use a system-level role and token when one Backstage instance must read many Projects. See the Kargo [API Tokens](https://docs.kargo.io/user-guide/security/api-tokens) documentation.

### Admin password

Set `adminPassword` to the Kargo admin account password. The backend calls `POST /v1beta1/login`, caches the returned ID token, and refreshes it one minute before it expires. Use this mode for development or small installations. The admin account has full access to Kargo.

### No credentials

If neither value is set, the backend sends no `Authorization` header. This works only when the Kargo API server runs with authentication disabled.

## Backend API

The backend exposes read-only routes under `/api/kargo`. Every route except `/health` requires a Backstage user or service token. Every project route accepts an optional `instance` query parameter.

| Route                                          | Description                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `GET /health`                                  | Liveness check. No authentication.                                          |
| `GET /instances`                               | Configured instance names and UI URLs.                                      |
| `GET /projects`                                | List Projects. Params: `filter`, `pageSize`, `page`.                        |
| `GET /projects/:project`                       | Get a Project.                                                              |
| `GET /projects/:project/stages`                | List Stages.                                                                |
| `GET /projects/:project/stages/:stage`         | Get a Stage.                                                                |
| `GET /projects/:project/promotions`            | List Promotions. Param: `stage`.                                            |
| `GET /projects/:project/promotions/:promotion` | Get a Promotion.                                                            |
| `GET /projects/:project/freight`               | Query Freight. Params: `stage`, `origins`, `groupBy`, `orderBy`, `reverse`. |
| `GET /projects/:project/freight/:freight`      | Get Freight by name or alias.                                               |
| `GET /projects/:project/warehouses`            | List Warehouses.                                                            |
| `GET /projects/:project/warehouses/:warehouse` | Get a Warehouse.                                                            |

## Development

This repository is a Backstage workspace. It contains an example app and backend that load the plugins.

```sh
corepack enable
yarn install
yarn tsc
yarn lint:all
CI=true yarn test
yarn build:all
```

Run the frontend plugin alone with sample data:

```sh
yarn --cwd plugins/kargo start
```

Run the backend plugin alone against a Kargo instance:

```sh
KARGO_URL=https://localhost:31444 KARGO_ADMIN_PASSWORD=admin KARGO_SKIP_TLS_VERIFY=true \
  yarn --cwd plugins/kargo-backend start
curl http://localhost:7007/api/kargo/projects
```

Run the full example app against a Kargo instance:

```sh
export KARGO_URL=https://localhost:31444
export KARGO_ADMIN_PASSWORD=admin
yarn start
```

See [docs/local-kargo.md](docs/local-kargo.md) for a way to run Kargo in Docker Desktop.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).

Kargo is a trademark of Akuity, Inc. This project is not affiliated with Akuity or the Backstage project.
