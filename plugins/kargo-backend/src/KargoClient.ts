import { LoggerService } from '@backstage/backend-plugin-api';
import {
  AuthenticationError,
  NotAllowedError,
  NotFoundError,
  ServiceUnavailableError,
} from '@backstage/errors';
import {
  KargoFreight,
  KargoProject,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { Agent, Dispatcher } from 'undici';
import { KargoInstanceConfig } from './config';

/**
 * Options for {@link KargoClient}.
 *
 * @public
 */
export interface KargoClientOptions {
  instance: KargoInstanceConfig;
  logger: LoggerService;
  requestTimeoutMs: number;
  /** Override for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Override for tests. Defaults to Date.now. */
  now?: () => number;
}

interface ListProjectsResponse {
  items?: KargoProject[];
  total?: number;
}

interface KubernetesList<T> {
  items?: T[];
}

interface QueryFreightResponse {
  groups?: Record<string, { items?: KargoFreight[] }>;
}

interface AdminLoginResponse {
  idToken?: string;
}

/**
 * The query parameters accepted by {@link KargoClient.queryFreight}.
 *
 * @public
 */
export interface QueryFreightOptions {
  stage?: string;
  origins?: string[];
  groupBy?: 'image_repo' | 'git_repo' | 'chart_repo';
  orderBy?: 'first_seen' | 'tag';
  reverse?: boolean;
}

/**
 * Safety margin, in milliseconds, before an admin ID token expires. The client
 * refreshes the token when it is inside this margin.
 */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/**
 * Fallback lifetime for an admin ID token that has no `exp` claim.
 */
const DEFAULT_TOKEN_LIFETIME_MS = 55 * 60_000;

function decodeJwtExpiry(token: string): number | undefined {
  const parts = token.split('.');
  if (parts.length < 2) {
    return undefined;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch {
    // Not a JWT. Treat it as opaque.
  }
  return undefined;
}

/**
 * A thin, typed client for the Kargo REST API (`/v1beta1`).
 *
 * The client is read-only. It never sends a mutating request to Kargo.
 *
 * @public
 */
export class KargoClient {
  private readonly instance: KargoInstanceConfig;
  private readonly logger: LoggerService;
  private readonly requestTimeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly dispatcher?: Dispatcher;

  private adminToken?: { value: string; expiresAt: number };
  private adminLoginInFlight?: Promise<string>;

  constructor(options: KargoClientOptions) {
    this.instance = options.instance;
    this.logger = options.logger.child({
      kargoInstance: options.instance.name,
    });
    this.requestTimeoutMs = options.requestTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    if (options.instance.skipTLSVerify) {
      this.logger.warn(
        'TLS certificate verification is disabled for this Kargo instance',
      );
      this.dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    }
  }

  get name(): string {
    return this.instance.name;
  }

  get uiUrl(): string {
    return this.instance.uiUrl;
  }

  async listProjects(options?: {
    filter?: string;
    pageSize?: number;
    page?: number;
  }): Promise<{ items: KargoProject[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.filter) params.set('filter', options.filter);
    if (options?.pageSize !== undefined)
      params.set('pageSize', String(options.pageSize));
    if (options?.page !== undefined) params.set('page', String(options.page));
    const response = await this.get<ListProjectsResponse>('/projects', params);
    const items = response.items ?? [];
    return { items, total: response.total ?? items.length };
  }

  async getProject(project: string): Promise<KargoProject> {
    return this.get<KargoProject>(`/projects/${enc(project)}`);
  }

  async listStages(project: string): Promise<KargoStage[]> {
    const response = await this.get<KubernetesList<KargoStage>>(
      `/projects/${enc(project)}/stages`,
    );
    return response.items ?? [];
  }

  async getStage(project: string, stage: string): Promise<KargoStage> {
    return this.get<KargoStage>(
      `/projects/${enc(project)}/stages/${enc(stage)}`,
    );
  }

  async listPromotions(
    project: string,
    options?: { stage?: string },
  ): Promise<KargoPromotion[]> {
    const params = new URLSearchParams();
    if (options?.stage) params.set('stage', options.stage);
    const response = await this.get<KubernetesList<KargoPromotion>>(
      `/projects/${enc(project)}/promotions`,
      params,
    );
    return response.items ?? [];
  }

  async getPromotion(
    project: string,
    promotion: string,
  ): Promise<KargoPromotion> {
    return this.get<KargoPromotion>(
      `/projects/${enc(project)}/promotions/${enc(promotion)}`,
    );
  }

  async queryFreight(
    project: string,
    options?: QueryFreightOptions,
  ): Promise<KargoFreight[]> {
    const params = new URLSearchParams();
    if (options?.stage) params.set('stage', options.stage);
    for (const origin of options?.origins ?? []) {
      params.append('origins', origin);
    }
    if (options?.groupBy) params.set('groupBy', options.groupBy);
    if (options?.orderBy) params.set('orderBy', options.orderBy);
    if (options?.reverse !== undefined)
      params.set('reverse', String(options.reverse));
    const response = await this.get<QueryFreightResponse>(
      `/projects/${enc(project)}/freight`,
      params,
    );
    const groups = response.groups ?? {};
    return Object.values(groups).flatMap(group => group.items ?? []);
  }

  async getFreight(
    project: string,
    nameOrAlias: string,
  ): Promise<KargoFreight> {
    return this.get<KargoFreight>(
      `/projects/${enc(project)}/freight/${enc(nameOrAlias)}`,
    );
  }

  async listWarehouses(project: string): Promise<KargoWarehouse[]> {
    const response = await this.get<KubernetesList<KargoWarehouse>>(
      `/projects/${enc(project)}/warehouses`,
    );
    return response.items ?? [];
  }

  async getWarehouse(
    project: string,
    warehouse: string,
  ): Promise<KargoWarehouse> {
    return this.get<KargoWarehouse>(
      `/projects/${enc(project)}/warehouses/${enc(warehouse)}`,
    );
  }

  private async get<T>(path: string, params?: URLSearchParams): Promise<T> {
    const query = params && params.size > 0 ? `?${params.toString()}` : '';
    const url = `${this.instance.url}/v1beta1${path}${query}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = await this.resolveToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.doFetch(url, { method: 'GET', headers });

    if (
      response.status === 401 &&
      this.instance.auth.type === 'adminPassword'
    ) {
      // The cached admin token may have been revoked. Log in once more.
      this.adminToken = undefined;
      const freshToken = await this.resolveToken();
      const retry = await this.doFetch(url, {
        method: 'GET',
        headers: { ...headers, Authorization: `Bearer ${freshToken}` },
      });
      return this.parseResponse<T>(retry, path);
    }

    return this.parseResponse<T>(response, path);
  }

  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
        // `dispatcher` is an undici extension to RequestInit.
        ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
      } as RequestInit);
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'AbortError'
          ? `timed out after ${this.requestTimeoutMs}ms`
          : (error as Error).message;
      throw new ServiceUnavailableError(
        `Request to Kargo instance "${this.instance.name}" failed: ${reason}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseResponse<T>(response: Response, path: string): Promise<T> {
    if (response.ok) {
      if (response.status === 204) {
        return {} as T;
      }
      return (await response.json()) as T;
    }

    const detail = await this.readErrorDetail(response);
    const message = `Kargo instance "${this.instance.name}" returned ${
      response.status
    } for ${path}${detail ? `: ${detail}` : ''}`;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new NotAllowedError(message);
      case 404:
        throw new NotFoundError(message);
      default:
        throw new ServiceUnavailableError(message);
    }
  }

  private async readErrorDetail(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return parsed.message ?? parsed.error ?? text.slice(0, 200);
      } catch {
        return text.slice(0, 200);
      }
    } catch {
      return '';
    }
  }

  private async resolveToken(): Promise<string | undefined> {
    const { auth } = this.instance;
    switch (auth.type) {
      case 'none':
        return undefined;
      case 'token':
        return auth.token;
      case 'adminPassword':
        return this.resolveAdminToken(auth.password);
      default:
        return undefined;
    }
  }

  private async resolveAdminToken(password: string): Promise<string> {
    const current = this.adminToken;
    if (current && current.expiresAt - TOKEN_REFRESH_MARGIN_MS > this.now()) {
      return current.value;
    }
    if (!this.adminLoginInFlight) {
      this.adminLoginInFlight = this.adminLogin(password).finally(() => {
        this.adminLoginInFlight = undefined;
      });
    }
    return this.adminLoginInFlight;
  }

  private async adminLogin(password: string): Promise<string> {
    this.logger.debug('Logging in to Kargo with the admin account');
    const response = await this.doFetch(`${this.instance.url}/v1beta1/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${password}`,
      },
    });
    if (!response.ok) {
      const detail = await this.readErrorDetail(response);
      throw new AuthenticationError(
        `Admin login to Kargo instance "${this.instance.name}" failed with ${
          response.status
        }${detail ? `: ${detail}` : ''}`,
      );
    }
    const body = (await response.json()) as AdminLoginResponse;
    if (!body.idToken) {
      throw new AuthenticationError(
        `Admin login to Kargo instance "${this.instance.name}" returned no idToken`,
      );
    }
    const expiresAt =
      decodeJwtExpiry(body.idToken) ?? this.now() + DEFAULT_TOKEN_LIFETIME_MS;
    this.adminToken = { value: body.idToken, expiresAt };
    return body.idToken;
  }
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}
