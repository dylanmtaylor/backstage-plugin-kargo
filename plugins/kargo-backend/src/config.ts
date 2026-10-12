import { Config } from '@backstage/config';
import { trimTrailingSlash } from '@dylanmtaylor/backstage-plugin-kargo-common';

/**
 * Credentials for one Kargo instance.
 *
 * @public
 */
export type KargoInstanceAuth =
  | { type: 'token'; token: string }
  | { type: 'adminPassword'; password: string }
  | { type: 'none' };

/**
 * Resolved configuration for one Kargo instance.
 *
 * @public
 */
export interface KargoInstanceConfig {
  name: string;
  url: string;
  uiUrl: string;
  auth: KargoInstanceAuth;
  skipTLSVerify: boolean;
}

/**
 * Resolved configuration for the Kargo plugin.
 *
 * @public
 */
export interface KargoPluginConfig {
  instances: KargoInstanceConfig[];
  cacheTtlSeconds: number;
  requestTimeoutMs: number;
}

const DEFAULT_CACHE_TTL_SECONDS = 10;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

function readAuth(instance: Config, name: string): KargoInstanceAuth {
  const token = instance.getOptionalString('token');
  const adminPassword = instance.getOptionalString('adminPassword');
  if (token && adminPassword) {
    throw new Error(
      `Kargo instance "${name}" sets both token and adminPassword. Set only one.`,
    );
  }
  if (token) {
    return { type: 'token', token };
  }
  if (adminPassword) {
    return { type: 'adminPassword', password: adminPassword };
  }
  return { type: 'none' };
}

function assertHttpUrl(value: string, context: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${context} is not a valid URL: "${value}"`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${context} must use http or https: "${value}"`);
  }
}

/**
 * Read and validate the `kargo` configuration block.
 *
 * @public
 */
export function readKargoConfig(rootConfig: Config): KargoPluginConfig {
  const config = rootConfig.getOptionalConfig('kargo');
  if (!config) {
    return {
      instances: [],
      cacheTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    };
  }

  const seen = new Set<string>();
  const instances =
    config.getOptionalConfigArray('instances')?.map(instance => {
      const name = instance.getString('name');
      if (seen.has(name)) {
        throw new Error(`Duplicate Kargo instance name "${name}"`);
      }
      seen.add(name);

      const url = trimTrailingSlash(instance.getString('url'));
      assertHttpUrl(url, `Kargo instance "${name}" url`);

      const uiUrl = trimTrailingSlash(
        instance.getOptionalString('uiUrl') ?? url,
      );
      assertHttpUrl(uiUrl, `Kargo instance "${name}" uiUrl`);

      return {
        name,
        url,
        uiUrl,
        auth: readAuth(instance, name),
        skipTLSVerify: instance.getOptionalBoolean('skipTLSVerify') ?? false,
      };
    }) ?? [];

  const cacheTtlSeconds =
    config.getOptionalNumber('cacheTtlSeconds') ?? DEFAULT_CACHE_TTL_SECONDS;
  if (cacheTtlSeconds < 0) {
    throw new Error('kargo.cacheTtlSeconds must be 0 or greater');
  }

  const requestTimeoutMs =
    config.getOptionalNumber('requestTimeoutMs') ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (requestTimeoutMs <= 0) {
    throw new Error('kargo.requestTimeoutMs must be greater than 0');
  }

  return { instances, cacheTtlSeconds, requestTimeoutMs };
}
