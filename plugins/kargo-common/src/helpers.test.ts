import {
  freightDisplayName,
  isTerminalPromotionPhase,
  kargoUiLinks,
  normalizeHealth,
  shortRepoName,
  shortSha,
  summarizeFreightArtifacts,
  trimTrailingSlash,
} from './helpers';

describe('helpers', () => {
  describe('trimTrailingSlash', () => {
    it('removes trailing slashes', () => {
      expect(trimTrailingSlash('https://kargo.example.com///')).toBe(
        'https://kargo.example.com',
      );
    });

    it('leaves URLs without a trailing slash unchanged', () => {
      expect(trimTrailingSlash('https://kargo.example.com')).toBe(
        'https://kargo.example.com',
      );
    });
  });

  describe('kargoUiLinks', () => {
    const base = 'https://kargo.example.com/';

    it('builds a project link', () => {
      expect(kargoUiLinks.project(base, 'demo')).toBe(
        'https://kargo.example.com/project/demo',
      );
    });

    it('builds a stage link', () => {
      expect(kargoUiLinks.stage(base, 'demo', 'prod')).toBe(
        'https://kargo.example.com/project/demo/stage/prod',
      );
    });

    it('builds a warehouse link', () => {
      expect(kargoUiLinks.warehouse(base, 'demo', 'main')).toBe(
        'https://kargo.example.com/project/demo/warehouse/main',
      );
    });

    it('builds a promotion link', () => {
      expect(kargoUiLinks.promotion(base, 'demo', 'prod.abc123')).toBe(
        'https://kargo.example.com/project/demo/promotion/prod.abc123',
      );
    });

    it('builds a freight link', () => {
      expect(kargoUiLinks.freight(base, 'demo', 'fuzzy-alias')).toBe(
        'https://kargo.example.com/project/demo/freight/fuzzy-alias',
      );
    });

    it('encodes special characters', () => {
      expect(kargoUiLinks.stage(base, 'a b', 'c/d')).toBe(
        'https://kargo.example.com/project/a%20b/stage/c%2Fd',
      );
    });
  });

  describe('normalizeHealth', () => {
    it('passes known values through', () => {
      expect(normalizeHealth('Healthy')).toBe('Healthy');
      expect(normalizeHealth('Unhealthy')).toBe('Unhealthy');
      expect(normalizeHealth('Progressing')).toBe('Progressing');
      expect(normalizeHealth('NotApplicable')).toBe('NotApplicable');
    });

    it('maps unknown values to Unknown', () => {
      expect(normalizeHealth(undefined)).toBe('Unknown');
      expect(normalizeHealth('Weird')).toBe('Unknown');
    });
  });

  describe('isTerminalPromotionPhase', () => {
    it('returns true for terminal phases', () => {
      expect(isTerminalPromotionPhase('Succeeded')).toBe(true);
      expect(isTerminalPromotionPhase('Failed')).toBe(true);
      expect(isTerminalPromotionPhase('Errored')).toBe(true);
      expect(isTerminalPromotionPhase('Aborted')).toBe(true);
    });

    it('returns false for active phases', () => {
      expect(isTerminalPromotionPhase('Pending')).toBe(false);
      expect(isTerminalPromotionPhase('Running')).toBe(false);
      expect(isTerminalPromotionPhase(undefined)).toBe(false);
    });
  });

  describe('shortRepoName', () => {
    it('returns the last path segment without .git', () => {
      expect(shortRepoName('https://github.com/akuity/kargo.git')).toBe(
        'kargo',
      );
      expect(shortRepoName('ghcr.io/akuity/kargo')).toBe('kargo');
      expect(shortRepoName('nginx')).toBe('nginx');
    });
  });

  describe('shortSha', () => {
    it('returns the first 7 characters', () => {
      expect(shortSha('0123456789abcdef')).toBe('0123456');
      expect(shortSha('abc')).toBe('abc');
      expect(shortSha(undefined)).toBe('');
    });
  });

  describe('summarizeFreightArtifacts', () => {
    it('returns an empty list for missing freight', () => {
      expect(summarizeFreightArtifacts(undefined)).toEqual([]);
    });

    it('summarizes images, commits, charts, and artifacts', () => {
      expect(
        summarizeFreightArtifacts({
          images: [
            { repoURL: 'ghcr.io/akuity/guestbook', tag: 'v1.2.3' },
            {
              repoURL: 'ghcr.io/akuity/other',
              digest: 'sha256:0123456789abcdef',
            },
          ],
          commits: [
            {
              repoURL: 'https://github.com/akuity/kargo-demo.git',
              id: 'fedcba9876543210',
            },
          ],
          charts: [
            {
              repoURL: 'https://charts.example.com',
              name: 'app',
              version: '2.0.0',
            },
            {
              repoURL: 'oci://registry.example.com/charts/other',
              version: '3.0.0',
            },
          ],
          artifacts: [{ artifactType: 'blob', version: '7' }, {}],
        }),
      ).toEqual([
        'guestbook:v1.2.3',
        'other:0123456',
        'kargo-demo@fedcba9',
        'app:2.0.0',
        'other:3.0.0',
        'blob:7',
      ]);
    });
  });

  describe('freightDisplayName', () => {
    it('prefers the alias', () => {
      expect(
        freightDisplayName({
          alias: 'brave-bear',
          metadata: { name: 'abc' },
        }),
      ).toBe('brave-bear');
    });

    it('falls back to the metadata name', () => {
      expect(freightDisplayName({ metadata: { name: 'abc' } })).toBe('abc');
    });

    it('falls back to the reference name', () => {
      expect(freightDisplayName({ name: 'ref' })).toBe('ref');
    });

    it('returns an empty string for missing freight', () => {
      expect(freightDisplayName(undefined)).toBe('');
    });
  });
});
