import { Entity } from '@backstage/catalog-model';
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
      const tester = createExtensionTester(extension);
      const filter = tester.get(EntityCardBlueprint.dataRefs.filterFunction);
      expect(filter).toBeDefined();
      expect(filter!(annotated)).toBe(true);
      expect(filter!(bare)).toBe(false);
      expect(tester.get(EntityCardBlueprint.dataRefs.type)).toBe('content');
    }
  });

  it('filters the entity content by the project annotation', () => {
    const tester = createExtensionTester(kargoEntityContent);
    const filter = tester.get(EntityContentBlueprint.dataRefs.filterFunction);
    expect(filter).toBeDefined();
    expect(filter!(annotated)).toBe(true);
    expect(filter!(bare)).toBe(false);
    expect(tester.get(EntityContentBlueprint.dataRefs.title)).toBe('Kargo');
  });
});
