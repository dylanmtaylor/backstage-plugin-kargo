import { kargoPlugin } from './plugin';

describe('kargo', () => {
  it('should export plugin', () => {
    expect(kargoPlugin).toBeDefined();
  });
});
