export interface Config {
  /**
   * Configuration for the Kargo plugin.
   */
  kargo?: {
    /**
     * One or more Kargo API servers. The first instance is the default.
     */
    instances: Array<{
      /**
       * A unique name for this instance. Entities select an instance with the
       * `kargo.akuity.io/instance` annotation.
       */
      name: string;
      /**
       * The base URL of the Kargo API server, for example
       * `https://kargo.example.com`. The plugin appends `/v1beta1`.
       */
      url: string;
      /**
       * An optional base URL of the Kargo UI. The plugin uses this URL for
       * deep links. The plugin uses `url` when this value is absent.
       */
      uiUrl?: string;
      /**
       * A bearer token for the Kargo API. Use an OIDC ID token or a Kargo
       * API token. Mutually exclusive with `adminPassword`.
       * @visibility secret
       */
      token?: string;
      /**
       * The Kargo admin account password. The plugin exchanges this password
       * for an ID token with `POST /v1beta1/login` and refreshes the token
       * before it expires. Mutually exclusive with `token`.
       * @visibility secret
       */
      adminPassword?: string;
      /**
       * Skip TLS certificate verification. Use only in development.
       */
      skipTLSVerify?: boolean;
    }>;
    /**
     * How long, in seconds, to cache responses from Kargo. Set to 0 to disable
     * the cache. Default: 10.
     */
    cacheTtlSeconds?: number;
    /**
     * Request timeout, in milliseconds, for calls to Kargo. Default: 15000.
     */
    requestTimeoutMs?: number;
  };
}
