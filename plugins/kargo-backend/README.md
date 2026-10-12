# @dylanmtaylor/backstage-plugin-kargo-backend

The Backstage backend plugin for [Kargo](https://kargo.io). It proxies read-only requests from the frontend plugin to one or more Kargo API servers and keeps Kargo credentials on the backend.

## Install

```sh
yarn --cwd packages/backend add @dylanmtaylor/backstage-plugin-kargo-backend
```

```ts
// packages/backend/src/index.ts
backend.add(import('@dylanmtaylor/backstage-plugin-kargo-backend'));
```

## Configuration

```yaml
kargo:
  instances:
    - name: production
      url: https://kargo.example.com
      uiUrl: https://kargo.example.com # Optional. Default: url.
      token: ${KARGO_TOKEN} # Or adminPassword. Not both.
      skipTLSVerify: false # Optional. Development only.
  cacheTtlSeconds: 10 # Optional. 0 disables the cache.
  requestTimeoutMs: 15000 # Optional.
```

| Key                         | Required | Description                                                      |
| --------------------------- | -------- | ---------------------------------------------------------------- |
| `instances[].name`          | Yes      | Unique name. Entities select it with `kargo.akuity.io/instance`. |
| `instances[].url`           | Yes      | Base URL of the Kargo API server. The plugin appends `/v1beta1`. |
| `instances[].uiUrl`         | No       | Base URL of the Kargo UI for deep links. Default: `url`.         |
| `instances[].token`         | No       | Bearer token. Marked `@visibility secret`.                       |
| `instances[].adminPassword` | No       | Admin password. The plugin exchanges it for an ID token. Secret. |
| `instances[].skipTLSVerify` | No       | Disable TLS verification. Default `false`.                       |
| `cacheTtlSeconds`           | No       | Cache lifetime for Kargo responses. Default `10`.                |
| `requestTimeoutMs`          | No       | Timeout for each request to Kargo. Default `15000`.              |

The plugin validates the configuration at startup. It rejects duplicate instance names, URLs that are not `http` or `https`, and instances that set both `token` and `adminPassword`.

## Routes

All routes are `GET` and read-only. Every route except `/health` requires Backstage credentials. Project routes accept an optional `instance` query parameter.

```
/api/kargo/health
/api/kargo/instances
/api/kargo/projects?filter=&pageSize=&page=
/api/kargo/projects/:project
/api/kargo/projects/:project/stages
/api/kargo/projects/:project/stages/:stage
/api/kargo/projects/:project/promotions?stage=
/api/kargo/projects/:project/promotions/:promotion
/api/kargo/projects/:project/freight?stage=&origins=&groupBy=&orderBy=&reverse=
/api/kargo/projects/:project/freight/:freight
/api/kargo/projects/:project/warehouses
/api/kargo/projects/:project/warehouses/:warehouse
```

List routes return `{ "items": [...] }`. `/projects` also returns `total`.

Errors from Kargo map to Backstage errors: `401` to `AuthenticationError`, `403` to `NotAllowedError`, `404` to `NotFoundError`, and other failures to `ServiceUnavailableError`.

## Programmatic use

The package exports `KargoClient`, `createKargoService`, `createRouter`, and `readKargoConfig` for custom backends or modules.

## Development

```sh
KARGO_URL=https://localhost:31444 \
KARGO_ADMIN_PASSWORD=admin \
KARGO_SKIP_TLS_VERIFY=true \
yarn start

curl http://localhost:7007/api/kargo/projects
```

The dev backend uses mock auth, so no Backstage token is needed.
