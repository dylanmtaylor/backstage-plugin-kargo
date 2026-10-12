import { Entity } from '@backstage/catalog-model';
import { createDevApp } from '@backstage/dev-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { Grid } from '@material-ui/core';
import { KARGO_ANNOTATIONS } from '@dylanmtaylor/backstage-plugin-kargo-common';
import {
  EntityKargoContent,
  EntityKargoPromotionsCard,
  EntityKargoStagesCard,
  kargoApiRef,
  kargoPlugin,
} from '../src';
import { MockKargoApi } from '../src/testUtils';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'guestbook',
    annotations: {
      [KARGO_ANNOTATIONS.PROJECT]: 'kargo-demo',
    },
  },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

const entityWithoutAnnotation: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'no-kargo' },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

createDevApp()
  .registerPlugin(kargoPlugin)
  .registerApi({
    api: kargoApiRef,
    deps: {},
    factory: () => new MockKargoApi(),
  })
  .addPage({
    path: '/kargo',
    title: 'Kargo tab',
    element: (
      <EntityProvider entity={entity}>
        <EntityKargoContent />
      </EntityProvider>
    ),
  })
  .addPage({
    path: '/cards',
    title: 'Overview cards',
    element: (
      <EntityProvider entity={entity}>
        <Grid container spacing={3}>
          <Grid item md={6}>
            <EntityKargoStagesCard />
          </Grid>
          <Grid item md={6}>
            <EntityKargoPromotionsCard limit={5} />
          </Grid>
        </Grid>
      </EntityProvider>
    ),
  })
  .addPage({
    path: '/missing',
    title: 'Missing annotation',
    element: (
      <EntityProvider entity={entityWithoutAnnotation}>
        <EntityKargoStagesCard />
      </EntityProvider>
    ),
  })
  .render();
