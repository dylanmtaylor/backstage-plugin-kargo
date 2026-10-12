import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod/v3';
import { KargoService } from './services/KargoService';

/**
 * Options for {@link createRouter}.
 *
 * @public
 */
export interface RouterOptions {
  kargoService: KargoService;
}

const instanceQuery = z.object({
  instance: z.string().min(1).optional(),
});

const listProjectsQuery = instanceQuery.extend({
  filter: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  page: z.coerce.number().int().min(0).optional(),
});

const listPromotionsQuery = instanceQuery.extend({
  stage: z.string().min(1).optional(),
});

const queryFreightQuery = instanceQuery.extend({
  stage: z.string().min(1).optional(),
  origins: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(value => {
      if (value === undefined) {
        return undefined;
      }
      return Array.isArray(value) ? value : [value];
    }),
  groupBy: z.enum(['image_repo', 'git_repo', 'chart_repo']).optional(),
  orderBy: z.enum(['first_seen', 'tag']).optional(),
  reverse: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => (value === undefined ? undefined : value === 'true')),
});

function parseQuery<T extends z.ZodTypeAny>(
  schema: T,
  query: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new InputError(`Invalid query: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Create the Kargo plugin router. Every route is read-only.
 *
 * Routes:
 * - `GET /instances`
 * - `GET /projects`
 * - `GET /projects/:project`
 * - `GET /projects/:project/stages`
 * - `GET /projects/:project/stages/:stage`
 * - `GET /projects/:project/promotions`
 * - `GET /projects/:project/promotions/:promotion`
 * - `GET /projects/:project/freight`
 * - `GET /projects/:project/freight/:freight`
 * - `GET /projects/:project/warehouses`
 * - `GET /projects/:project/warehouses/:warehouse`
 *
 * Every project route accepts an optional `instance` query parameter.
 *
 * @public
 */
export async function createRouter({
  kargoService,
}: RouterOptions): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/instances', (_req, res) => {
    res.json({ items: kargoService.listInstances() });
  });

  router.get('/projects', async (req, res) => {
    const { instance, ...options } = parseQuery(listProjectsQuery, req.query);
    res.json(await kargoService.listProjects(instance, options));
  });

  router.get('/projects/:project', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json(await kargoService.getProject(instance, req.params.project));
  });

  router.get('/projects/:project/stages', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json({
      items: await kargoService.listStages(instance, req.params.project),
    });
  });

  router.get('/projects/:project/stages/:stage', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json(
      await kargoService.getStage(
        instance,
        req.params.project,
        req.params.stage,
      ),
    );
  });

  router.get('/projects/:project/promotions', async (req, res) => {
    const { instance, ...options } = parseQuery(listPromotionsQuery, req.query);
    res.json({
      items: await kargoService.listPromotions(
        instance,
        req.params.project,
        options,
      ),
    });
  });

  router.get('/projects/:project/promotions/:promotion', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json(
      await kargoService.getPromotion(
        instance,
        req.params.project,
        req.params.promotion,
      ),
    );
  });

  router.get('/projects/:project/freight', async (req, res) => {
    const { instance, ...options } = parseQuery(queryFreightQuery, req.query);
    res.json({
      items: await kargoService.queryFreight(
        instance,
        req.params.project,
        options,
      ),
    });
  });

  router.get('/projects/:project/freight/:freight', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json(
      await kargoService.getFreight(
        instance,
        req.params.project,
        req.params.freight,
      ),
    );
  });

  router.get('/projects/:project/warehouses', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json({
      items: await kargoService.listWarehouses(instance, req.params.project),
    });
  });

  router.get('/projects/:project/warehouses/:warehouse', async (req, res) => {
    const { instance } = parseQuery(instanceQuery, req.query);
    res.json(
      await kargoService.getWarehouse(
        instance,
        req.params.project,
        req.params.warehouse,
      ),
    );
  });

  return router;
}
