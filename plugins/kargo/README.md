# @dylanmtaylor/backstage-plugin-kargo

The Backstage frontend plugin for [Kargo](https://kargo.io). It shows Kargo Stages, Warehouses, and Promotions on entity pages and links to the Kargo UI.

This package needs [`@dylanmtaylor/backstage-plugin-kargo-backend`](../kargo-backend) in the Backstage backend.

## Install

```sh
yarn --cwd packages/app add @dylanmtaylor/backstage-plugin-kargo
```

## New frontend system

Import the plugin from the `/alpha` entry point, or let `packages: all` discovery find it:

```tsx
import kargoPlugin from '@dylanmtaylor/backstage-plugin-kargo/alpha';

createApp({ features: [kargoPlugin] });
```

Extensions:

| Extension                      | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `api:kargo`                    | The `KargoApi` implementation.               |
| `entity-card:kargo/stages`     | Stage table for entity overview pages.       |
| `entity-card:kargo/promotions` | Promotion table for entity overview pages.   |
| `entity-card:kargo/warehouses` | Warehouse table for entity overview pages.   |
| `entity-content:kargo/kargo`   | The `Kargo` tab at `/kargo` on entity pages. |

Every extension is filtered to entities that have the `kargo.akuity.io/project` annotation.

## Legacy frontend system

```tsx
import {
  EntityKargoContent,
  EntityKargoStagesCard,
  EntityKargoPromotionsCard,
  EntityKargoWarehousesCard,
  isKargoAvailable,
} from '@dylanmtaylor/backstage-plugin-kargo';

// A tab
<EntityLayout.Route if={isKargoAvailable} path="/kargo" title="Kargo">
  <EntityKargoContent />
</EntityLayout.Route>

// Cards
<EntitySwitch>
  <EntitySwitch.Case if={isKargoAvailable}>
    <Grid item md={12}>
      <EntityKargoStagesCard />
    </Grid>
    <Grid item md={6}>
      <EntityKargoPromotionsCard limit={10} />
    </Grid>
    <Grid item md={6}>
      <EntityKargoWarehousesCard />
    </Grid>
  </EntitySwitch.Case>
</EntitySwitch>
```

## Annotations

| Annotation                   | Required | Description                                                         |
| ---------------------------- | -------- | ------------------------------------------------------------------- |
| `kargo.akuity.io/project`    | Yes      | The Kargo Project.                                                  |
| `kargo.akuity.io/stages`     | No       | Comma-separated Stage names. Default: every Stage.                  |
| `kargo.akuity.io/warehouses` | No       | Comma-separated Warehouse names. Default: every Warehouse.          |
| `kargo.akuity.io/instance`   | No       | A configured instance name. Default: the first configured instance. |

## Component props

Every card accepts `title`, `variant`, and `refreshIntervalMs` (default 30000; set 0 to disable polling). `EntityKargoPromotionsCard` also accepts `limit` (default 20). `EntityKargoContent` accepts `refreshIntervalMs` and `promotionLimit` (default 50).

## Hooks and API

The package exports `kargoApiRef`, the `KargoApi` interface, `KargoClient`, and hooks for custom components:

```ts
import {
  useKargoEntityInfo,
  useKargoStages,
  useKargoPromotions,
  useKargoWarehouses,
  useKargoInstance,
} from '@dylanmtaylor/backstage-plugin-kargo';
```

## Testing

`@dylanmtaylor/backstage-plugin-kargo/testUtils` exports `MockKargoApi` and `mockKargoData` for tests of custom components:

```tsx
import { kargoApiRef } from '@dylanmtaylor/backstage-plugin-kargo';
import { MockKargoApi } from '@dylanmtaylor/backstage-plugin-kargo/testUtils';

<TestApiProvider apis={[[kargoApiRef, new MockKargoApi()]]}>
  ...
</TestApiProvider>;
```

## Development

```sh
yarn start
```

This serves the plugin alone with `MockKargoApi` data at http://localhost:3000.
