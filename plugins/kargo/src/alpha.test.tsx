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

const expectedFilter = 'has(metadata.annotations."kargo.akuity.io/project")';

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
      expect(tester.get(EntityCardBlueprint.dataRefs.filterExpression)).toBe(
        expectedFilter,
      );
      expect(tester.get(EntityCardBlueprint.dataRefs.type)).toBe('content');
    }
  });

  it('filters the entity content by the project annotation', () => {
    const tester = createExtensionTester(kargoEntityContent);
    expect(tester.get(EntityContentBlueprint.dataRefs.filterExpression)).toBe(
      expectedFilter,
    );
    expect(tester.get(EntityContentBlueprint.dataRefs.title)).toBe('Kargo');
  });
});
