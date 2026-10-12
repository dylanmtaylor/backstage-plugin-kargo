import { Entity } from '@backstage/catalog-model';
import { getKargoEntityInfo, isKargoAvailable } from './useKargoEntityInfo';

function entity(annotations?: Record<string, string>): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'x', annotations },
  };
}

describe('getKargoEntityInfo', () => {
  it('returns empty info when annotations are absent', () => {
    expect(getKargoEntityInfo(entity())).toEqual({
      project: undefined,
      stages: [],
      warehouses: [],
      instance: undefined,
    });
    expect(isKargoAvailable(entity())).toBe(false);
  });

  it('reads every annotation', () => {
    const info = getKargoEntityInfo(
      entity({
        'kargo.akuity.io/project': ' demo ',
        'kargo.akuity.io/stages': 'test, prod',
        'kargo.akuity.io/warehouses': 'main',
        'kargo.akuity.io/instance': 'prod-cluster',
      }),
    );
    expect(info).toEqual({
      project: 'demo',
      stages: ['test', 'prod'],
      warehouses: ['main'],
      instance: 'prod-cluster',
    });
    expect(
      isKargoAvailable(entity({ 'kargo.akuity.io/project': 'demo' })),
    ).toBe(true);
  });

  it('treats a blank project as absent', () => {
    expect(isKargoAvailable(entity({ 'kargo.akuity.io/project': '  ' }))).toBe(
      false,
    );
  });
});
