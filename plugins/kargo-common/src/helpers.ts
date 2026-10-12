import {
  KargoFreight,
  KargoFreightReference,
  KargoHealthState,
  KargoPromotionPhase,
} from './types';

/**
 * Remove trailing slashes from a URL.
 *
 * @public
 */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Build deep links into the Kargo UI. The Kargo UI route layout is stable
 * across the 1.x series.
 *
 * @public
 */
export const kargoUiLinks = {
  project: (baseUrl: string, project: string) =>
    `${trimTrailingSlash(baseUrl)}/project/${encodeURIComponent(project)}`,
  stage: (baseUrl: string, project: string, stage: string) =>
    `${trimTrailingSlash(baseUrl)}/project/${encodeURIComponent(
      project,
    )}/stage/${encodeURIComponent(stage)}`,
  warehouse: (baseUrl: string, project: string, warehouse: string) =>
    `${trimTrailingSlash(baseUrl)}/project/${encodeURIComponent(
      project,
    )}/warehouse/${encodeURIComponent(warehouse)}`,
  promotion: (baseUrl: string, project: string, promotion: string) =>
    `${trimTrailingSlash(baseUrl)}/project/${encodeURIComponent(
      project,
    )}/promotion/${encodeURIComponent(promotion)}`,
  freight: (baseUrl: string, project: string, freight: string) =>
    `${trimTrailingSlash(baseUrl)}/project/${encodeURIComponent(
      project,
    )}/freight/${encodeURIComponent(freight)}`,
};

/**
 * Normalize an unknown health string to a known health state.
 *
 * @public
 */
export function normalizeHealth(status?: string): KargoHealthState {
  switch (status) {
    case 'Healthy':
    case 'Unhealthy':
    case 'Progressing':
    case 'NotApplicable':
      return status;
    default:
      return 'Unknown';
  }
}

/**
 * Report whether a Promotion phase is terminal.
 *
 * @public
 */
export function isTerminalPromotionPhase(phase?: string): boolean {
  switch (phase as KargoPromotionPhase | undefined) {
    case 'Succeeded':
    case 'Failed':
    case 'Errored':
    case 'Aborted':
      return true;
    default:
      return false;
  }
}

/**
 * Return the last path segment of a repository URL, without a `.git` suffix.
 *
 * @public
 */
export function shortRepoName(repoURL: string): string {
  const trimmed = trimTrailingSlash(repoURL).replace(/\.git$/, '');
  const segments = trimmed.split('/');
  return segments[segments.length - 1] || repoURL;
}

/**
 * Return the first 7 characters of a commit SHA.
 *
 * @public
 */
export function shortSha(sha?: string): string {
  if (!sha) {
    return '';
  }
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

/**
 * Build short, human-readable labels for every artifact in a piece of Freight.
 * The order is: images, commits, charts, then other artifacts.
 *
 * @public
 */
export function summarizeFreightArtifacts(
  freight?: KargoFreight | KargoFreightReference,
): string[] {
  if (!freight) {
    return [];
  }
  const labels: string[] = [];
  for (const image of freight.images ?? []) {
    const version = image.tag ?? shortSha(image.digest?.replace('sha256:', ''));
    labels.push(`${shortRepoName(image.repoURL)}:${version}`);
  }
  for (const commit of freight.commits ?? []) {
    labels.push(`${shortRepoName(commit.repoURL)}@${shortSha(commit.id)}`);
  }
  for (const chart of freight.charts ?? []) {
    const name = chart.name ? `${chart.name}` : shortRepoName(chart.repoURL);
    labels.push(`${name}:${chart.version}`);
  }
  for (const artifact of freight.artifacts ?? []) {
    if (artifact.version) {
      labels.push(
        `${artifact.artifactType ?? artifact.subscriptionName ?? 'artifact'}:${
          artifact.version
        }`,
      );
    }
  }
  return labels;
}

/**
 * Return a display name for a piece of Freight. The alias is preferred. The
 * name is used when there is no alias.
 *
 * @public
 */
export function freightDisplayName(
  freight?: KargoFreight | KargoFreightReference,
): string {
  if (!freight) {
    return '';
  }
  if ('alias' in freight && freight.alias) {
    return freight.alias;
  }
  if ('metadata' in freight && freight.metadata?.name) {
    return freight.metadata.name;
  }
  return freight.name ?? '';
}
