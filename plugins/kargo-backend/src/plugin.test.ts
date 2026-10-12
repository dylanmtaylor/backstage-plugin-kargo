import {
  mockCredentials,
  mockServices,
  startTestBackend,
} from '@backstage/backend-test-utils';
import request from 'supertest';
import { kargoPlugin } from './plugin';

describe('kargoPlugin', () => {
  it('serves the health endpoint without authentication', async () => {
    const { server } = await startTestBackend({
      features: [kargoPlugin, mockServices.rootConfig.factory({ data: {} })],
    });

    await request(server)
      .get('/api/kargo/health')
      .set('Authorization', mockCredentials.none.header())
      .expect(200, { status: 'ok' });
  });

  it('lists configured instances without exposing credentials', async () => {
    const { server } = await startTestBackend({
      features: [
        kargoPlugin,
        mockServices.rootConfig.factory({
          data: {
            kargo: {
              instances: [
                {
                  name: 'prod',
                  url: 'https://kargo.example.com',
                  token: 'super-secret',
                },
              ],
            },
          },
        }),
      ],
    });

    const response = await request(server).get('/api/kargo/instances');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [{ name: 'prod', url: 'https://kargo.example.com' }],
    });
    expect(response.text).not.toContain('super-secret');
  });

  it('requires authentication for data routes', async () => {
    const { server } = await startTestBackend({
      features: [kargoPlugin, mockServices.rootConfig.factory({ data: {} })],
    });

    await request(server)
      .get('/api/kargo/instances')
      .set('Authorization', mockCredentials.none.header())
      .expect(401);
  });

  it('returns 404 when no instance is configured', async () => {
    const { server } = await startTestBackend({
      features: [kargoPlugin, mockServices.rootConfig.factory({ data: {} })],
    });

    const response = await request(server).get(
      '/api/kargo/projects/demo/stages',
    );
    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain(
      'No Kargo instances are configured',
    );
  });
});
