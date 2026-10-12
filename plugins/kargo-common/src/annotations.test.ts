import { KARGO_ANNOTATIONS, parseAnnotationList } from './annotations';

describe('annotations', () => {
  it('uses the kargo.akuity.io prefix', () => {
    for (const key of Object.values(KARGO_ANNOTATIONS)) {
      expect(key.startsWith('kargo.akuity.io/')).toBe(true);
    }
  });

  describe('parseAnnotationList', () => {
    it('returns an empty list for missing values', () => {
      expect(parseAnnotationList(undefined)).toEqual([]);
      expect(parseAnnotationList('')).toEqual([]);
    });

    it('splits, trims, and removes empty entries', () => {
      expect(parseAnnotationList(' dev, staging ,,prod ')).toEqual([
        'dev',
        'staging',
        'prod',
      ]);
    });
  });
});
