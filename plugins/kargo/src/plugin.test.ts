import {
  EntityKargoContent,
  EntityKargoPromotionsCard,
  EntityKargoStagesCard,
  EntityKargoWarehousesCard,
  kargoPlugin,
} from './plugin';

describe('kargoPlugin', () => {
  it('exports the plugin and extensions', () => {
    expect(kargoPlugin.getId()).toBe('kargo');
    expect(EntityKargoContent).toBeDefined();
    expect(EntityKargoStagesCard).toBeDefined();
    expect(EntityKargoPromotionsCard).toBeDefined();
    expect(EntityKargoWarehousesCard).toBeDefined();
  });

  it('provides the Kargo API', () => {
    const apis = [...kargoPlugin.getApis()];
    expect(apis.map(a => a.api.id)).toEqual(['plugin.kargo.service']);
  });
});
