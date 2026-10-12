import { mockErrorHandler } from '@backstage/backend-test-utils';
import { NotFoundError } from '@backstage/errors';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { KargoService } from './services/KargoService';

describe('createRouter', () => {
  let app: express.Express;
  let kargoService: jest.Mocked<KargoService>;

  beforeEach(async () => {
    kargoService = {
      listInstances: jest.fn(),
      listProjects: jest.fn(),
      getProject: jest.fn(),
      listStages: jest.fn(),
      getStage: jest.fn(),
      listPromotions: jest.fn(),
      getPromotion: jest.fn(),
      queryFreight: jest.fn(),
      getFreight: jest.fn(),
      listWarehouses: jest.fn(),
      getWarehouse: jest.fn(),
    };
    app = express();
    app.use(await createRouter({ kargoService }));
    app.use(mockErrorHandler());
  });

  it('GET /health', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
  });

  it('GET /instances', async () => {
    kargoService.listInstances.mockReturnValue([
      { name: 'prod', url: 'https://kargo.example.com' },
    ]);
    await request(app)
      .get('/instances')
      .expect(200, {
        items: [{ name: 'prod', url: 'https://kargo.example.com' }],
      });
  });

  it('GET /projects passes pagination and instance', async () => {
    kargoService.listProjects.mockResolvedValue({ items: [], total: 0 });
    await request(app)
      .get('/projects?instance=prod&filter=de&pageSize=5&page=2')
      .expect(200, { items: [], total: 0 });
    expect(kargoService.listProjects).toHaveBeenCalledWith('prod', {
      filter: 'de',
      pageSize: 5,
      page: 2,
    });
  });

  it('GET /projects rejects invalid pagination', async () => {
    const response = await request(app).get('/projects?pageSize=abc');
    expect(response.status).toBe(400);
    expect(response.body.error.name).toBe('InputError');
  });

  it('GET /projects/:project', async () => {
    kargoService.getProject.mockResolvedValue({ metadata: { name: 'demo' } });
    await request(app)
      .get('/projects/demo')
      .expect(200, { metadata: { name: 'demo' } });
    expect(kargoService.getProject).toHaveBeenCalledWith(undefined, 'demo');
  });

  it('GET /projects/:project/stages', async () => {
    kargoService.listStages.mockResolvedValue([{ metadata: { name: 'dev' } }]);
    await request(app)
      .get('/projects/demo/stages?instance=x')
      .expect(200, { items: [{ metadata: { name: 'dev' } }] });
    expect(kargoService.listStages).toHaveBeenCalledWith('x', 'demo');
  });

  it('GET /projects/:project/stages/:stage', async () => {
    kargoService.getStage.mockResolvedValue({ metadata: { name: 'dev' } });
    await request(app).get('/projects/demo/stages/dev').expect(200);
    expect(kargoService.getStage).toHaveBeenCalledWith(
      undefined,
      'demo',
      'dev',
    );
  });

  it('GET /projects/:project/promotions with stage filter', async () => {
    kargoService.listPromotions.mockResolvedValue([]);
    await request(app)
      .get('/projects/demo/promotions?stage=prod')
      .expect(200, { items: [] });
    expect(kargoService.listPromotions).toHaveBeenCalledWith(
      undefined,
      'demo',
      { stage: 'prod' },
    );
  });

  it('GET /projects/:project/promotions/:promotion', async () => {
    kargoService.getPromotion.mockResolvedValue({
      metadata: { name: 'p1' },
      spec: { stage: 'dev', freight: 'f' },
    });
    await request(app).get('/projects/demo/promotions/p1').expect(200);
    expect(kargoService.getPromotion).toHaveBeenCalledWith(
      undefined,
      'demo',
      'p1',
    );
  });

  it('GET /projects/:project/freight parses query options', async () => {
    kargoService.queryFreight.mockResolvedValue([]);
    await request(app)
      .get(
        '/projects/demo/freight?stage=prod&origins=a&origins=b&groupBy=image_repo&orderBy=tag&reverse=true',
      )
      .expect(200, { items: [] });
    expect(kargoService.queryFreight).toHaveBeenCalledWith(undefined, 'demo', {
      stage: 'prod',
      origins: ['a', 'b'],
      groupBy: 'image_repo',
      orderBy: 'tag',
      reverse: true,
    });
  });

  it('GET /projects/:project/freight accepts a single origin', async () => {
    kargoService.queryFreight.mockResolvedValue([]);
    await request(app).get('/projects/demo/freight?origins=a').expect(200);
    expect(kargoService.queryFreight).toHaveBeenCalledWith(
      undefined,
      'demo',
      expect.objectContaining({ origins: ['a'] }),
    );
  });

  it('GET /projects/:project/freight rejects an invalid groupBy', async () => {
    await request(app).get('/projects/demo/freight?groupBy=nope').expect(400);
  });

  it('GET /projects/:project/freight/:freight', async () => {
    kargoService.getFreight.mockResolvedValue({ metadata: { name: 'f' } });
    await request(app).get('/projects/demo/freight/f').expect(200);
    expect(kargoService.getFreight).toHaveBeenCalledWith(
      undefined,
      'demo',
      'f',
    );
  });

  it('GET /projects/:project/warehouses', async () => {
    kargoService.listWarehouses.mockResolvedValue([]);
    await request(app)
      .get('/projects/demo/warehouses')
      .expect(200, { items: [] });
  });

  it('GET /projects/:project/warehouses/:warehouse', async () => {
    kargoService.getWarehouse.mockResolvedValue({ metadata: { name: 'w' } });
    await request(app).get('/projects/demo/warehouses/w').expect(200);
    expect(kargoService.getWarehouse).toHaveBeenCalledWith(
      undefined,
      'demo',
      'w',
    );
  });

  it('forwards service errors with the matching status', async () => {
    kargoService.getStage.mockRejectedValue(new NotFoundError('nope'));
    const response = await request(app).get('/projects/demo/stages/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.name).toBe('NotFoundError');
  });
});
