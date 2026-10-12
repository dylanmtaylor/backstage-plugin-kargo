import { Entity } from '@backstage/catalog-model';
import { ExtensionDefinition } from '@backstage/frontend-plugin-api';
import { createExtensionTester } from '@backstage/frontend-test-utils';
import {
  EntityCardBlueprint,
  EntityContentBlueprint,
} from '@backstage/plugin-catalog-react/alpha';
import plugin, {
  kargoEntityContent,
  kargoPromotionsEntityCard,
  kargoStagesEntityCard,
  kargoWarehousesEntityCard,
} from './alpha';

const annotated: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'a',
    annotations: { 'kargo.akuity.io/project': 'demo' },
  },
};

const bare: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'b' },
};

// The blueprints return OverridableExtensionDefinition, whose generic
// parameter does not unify with the tester signature under strict checks.
function tester<T extends { T: any }>(extension: T) {
  return createExtensionTester(
    extension as unknown as ExtensionDefinition<T['T']>,
  );
}

describe('alpha plugin', () => {
  it('has the kargo plugin id', () => {
    expect(plugin.pluginId).toBe('kargo');
  });

  it('filters entity cards by the project annotation', () => {
    for (const extension of [
      kargoStagesEntityCard,
      kargoPromotionsEntityCard,
      kargoWarehousesEntityCard,
    ]) {
      const t = tester(extension);
      const filter = t.get(EntityCardBlueprint.dataRefs.filterFunction);
      expect(filter).toBeDefined();
      expect(filter!(annotated)).toBe(true);
      expect(filter!(bare)).toBe(false);
      expect(t.get(EntityCardBlueprint.dataRefs.type)).toBe('content');
    }
  });

  it('filters the entity content by the project annotation', () => {
    const t = tester(kargoEntityContent);
    const filter = t.get(EntityContentBlueprint.dataRefs.filterFunction);
    expect(filter).toBeDefined();
    expect(filter!(annotated)).toBe(true);
    expect(filter!(bare)).toBe(false);
    expect(t.get(EntityContentBlueprint.dataRefs.title)).toBe('Kargo');
  });
});
