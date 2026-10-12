# Contributing

Thank you for your interest in this project. Issues and pull requests are welcome.

## Set up

```sh
corepack enable
yarn install
```

Node.js 22 or 24 is required. The repository uses Yarn 4 through corepack.

## Check your change

Run every gate before you open a pull request:

```sh
yarn tsc
yarn lint:all
yarn prettier:check
CI=true yarn test
yarn build:all
yarn backstage-cli repo fix --check
```

`CI=true` stops Jest from entering watch mode.

## Layout

| Path                    | Content                                         |
| ----------------------- | ----------------------------------------------- |
| `plugins/kargo`         | Frontend plugin                                 |
| `plugins/kargo-backend` | Backend plugin                                  |
| `plugins/kargo-common`  | Shared types and helpers                        |
| `packages/app`          | Example Backstage app that loads the plugin     |
| `packages/backend`      | Example Backstage backend that loads the plugin |
| `docs`                  | Guides and example manifests                    |

## Guidelines

- Keep the plugins read-only. Do not add routes or UI that mutate Kargo resources.
- Keep credentials in the backend. The frontend must never receive a Kargo token or password.
- Add or update tests with every change. Backend changes need router and client tests. Frontend changes need component tests against `MockKargoApi`.
- Use the Kargo REST API (`/v1beta1`) only. Do not depend on the Kubernetes API directly.
- Follow the existing code style. Prettier and ESLint enforce most of it.
- Write commit messages in the imperative mood with a conventional prefix: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`.

## Release

Versions follow semantic versioning. Update `CHANGELOG.md`, bump the version in each `plugins/*/package.json`, tag the commit `vX.Y.Z`, and push the tag. The release workflow packs the three packages and publishes them to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) and provenance. No npm token is stored in the repository. Each package on npmjs.com must list this repository and `.github/workflows/release.yml` as a trusted publisher before the first release.
