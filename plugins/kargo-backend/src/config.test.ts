import { ConfigReader } from '@backstage/config';
import { readKargoConfig } from './config';

describe('readKargoConfig', () => {
  it('returns defaults when the kargo block is absent', () => {
    expect(readKargoConfig(new ConfigReader({}))).toEqual({
      instances: [],
      cacheTtlSeconds: 10,
      requestTimeoutMs: 15000,
    });
  });

  it('reads instances and trims trailing slashes', () => {
    const config = readKargoConfig(
      new ConfigReader({
        kargo: {
          cacheTtlSeconds: 30,
          requestTimeoutMs: 5000,
          instances: [
            {
              name: 'prod',
              url: 'https://kargo.example.com/',
              uiUrl: 'https://kargo-ui.example.com/',
              token: 'abc',
            },
            {
              name: 'dev',
              url: 'https://localhost:31444',
              adminPassword: 'admin',
              skipTLSVerify: true,
            },
            { name: 'open', url: 'http://kargo.internal' },
          ],
        },
      }),
    );

    expect(config).toEqual({
      cacheTtlSeconds: 30,
      requestTimeoutMs: 5000,
      instances: [
        {
          name: 'prod',
          url: 'https://kargo.example.com',
          uiUrl: 'https://kargo-ui.example.com',
          auth: { type: 'token', token: 'abc' },
          skipTLSVerify: false,
        },
        {
          name: 'dev',
          url: 'https://localhost:31444',
          uiUrl: 'https://localhost:31444',
          auth: { type: 'adminPassword', password: 'admin' },
          skipTLSVerify: true,
        },
        {
          name: 'open',
          url: 'http://kargo.internal',
          uiUrl: 'http://kargo.internal',
          auth: { type: 'none' },
          skipTLSVerify: false,
        },
      ],
    });
  });

  it('rejects duplicate instance names', () => {
    expect(() =>
      readKargoConfig(
        new ConfigReader({
          kargo: {
            instances: [
              { name: 'a', url: 'https://a' },
              { name: 'a', url: 'https://b' },
            ],
          },
        }),
      ),
    ).toThrow('Duplicate Kargo instance name "a"');
  });

  it('rejects both token and adminPassword', () => {
    expect(() =>
      readKargoConfig(
        new ConfigReader({
          kargo: {
            instances: [
              { name: 'a', url: 'https://a', token: 't', adminPassword: 'p' },
            ],
          },
        }),
      ),
    ).toThrow('sets both token and adminPassword');
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      readKargoConfig(
        new ConfigReader({
          kargo: { instances: [{ name: 'a', url: 'not a url' }] },
        }),
      ),
    ).toThrow('is not a valid URL');
    expect(() =>
      readKargoConfig(
        new ConfigReader({
          kargo: { instances: [{ name: 'a', url: 'ftp://a' }] },
        }),
      ),
    ).toThrow('must use http or https');
  });

  it('rejects invalid numeric settings', () => {
    expect(() =>
      readKargoConfig(
        new ConfigReader({ kargo: { instances: [], cacheTtlSeconds: -1 } }),
      ),
    ).toThrow('cacheTtlSeconds');
    expect(() =>
      readKargoConfig(
        new ConfigReader({ kargo: { instances: [], requestTimeoutMs: 0 } }),
      ),
    ).toThrow('requestTimeoutMs');
  });
});
