import {
  KargoFreight,
  KargoInstanceInfo,
  KargoProject,
  KargoPromotion,
  KargoStage,
  KargoWarehouse,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { KargoApi } from '../api/KargoApi';

const now = Date.now();
const minutesAgo = (minutes: number) =>
  new Date(now - minutes * 60_000).toISOString();

const guestbookImage = {
  repoURL: 'ghcr.io/akuity/guestbook',
  tag: 'v0.4.2',
  digest:
    'sha256:0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0',
};

const demoCommit = {
  repoURL: 'https://github.com/akuity/kargo-demo.git',
  id: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
  branch: 'main',
  message: 'Bump guestbook to v0.4.2',
  author: 'Jane Doe <jane@example.com>',
};

/**
 * Sample Kargo data for tests and the dev app.
 *
 * @public
 */
export const mockKargoData = {
  instances: [
    { name: 'local', url: 'https://kargo.example.com' },
  ] as KargoInstanceInfo[],

  projects: [
    { metadata: { name: 'kargo-demo', creationTimestamp: minutesAgo(10_000) } },
  ] as KargoProject[],

  warehouses: [
    {
      metadata: {
        name: 'main',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(10_000),
      },
      spec: {
        interval: '5m0s',
        subscriptions: [{ image: { repoURL: 'ghcr.io/akuity/guestbook' } }],
      },
      status: {
        lastFreightID: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
        conditions: [
          { type: 'Ready', status: 'True', reason: 'Synced' },
          { type: 'Healthy', status: 'True', reason: 'Healthy' },
        ],
      },
    },
  ] as KargoWarehouse[],

  freight: [
    {
      metadata: {
        name: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(90),
      },
      alias: 'brave-bear',
      origin: { kind: 'Warehouse', name: 'main' },
      images: [guestbookImage],
      commits: [demoCommit],
      status: {
        currentlyIn: {
          test: { since: minutesAgo(80) },
          uat: { since: minutesAgo(30) },
        },
        verifiedIn: { test: {}, uat: {} },
      },
    },
    {
      metadata: {
        name: 'e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(600),
      },
      alias: 'calm-otter',
      origin: { kind: 'Warehouse', name: 'main' },
      images: [{ ...guestbookImage, tag: 'v0.4.1' }],
      status: {
        currentlyIn: { prod: { since: minutesAgo(500) } },
        verifiedIn: { test: {}, uat: {}, prod: {} },
      },
    },
  ] as KargoFreight[],

  stages: [
    {
      metadata: {
        name: 'test',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(10_000),
      },
      spec: {
        requestedFreight: [
          {
            origin: { kind: 'Warehouse', name: 'main' },
            sources: { direct: true },
          },
        ],
      },
      status: {
        health: { status: 'Healthy' },
        autoPromotionEnabled: true,
        lastPromotion: {
          name: 'test.01hz9x7v8k2m3n4p5q6r7s8t9u.f3c2a1b',
          finishedAt: minutesAgo(80),
          status: { phase: 'Succeeded' },
        },
        freightHistory: [
          {
            id: 'fh-test-1',
            items: {
              main: {
                name: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
                origin: { kind: 'Warehouse', name: 'main' },
                images: [guestbookImage],
                commits: [demoCommit],
              },
            },
            verificationHistory: [
              {
                id: 'v1',
                phase: 'Successful',
                startTime: minutesAgo(79),
                finishTime: minutesAgo(75),
              },
            ],
          },
        ],
      },
    },
    {
      metadata: {
        name: 'uat',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(10_000),
      },
      status: {
        health: { status: 'Progressing' },
        autoPromotionEnabled: true,
        currentPromotion: {
          name: 'uat.01hz9y1a2b3c4d5e6f7g8h9i0j.f3c2a1b',
        },
        lastPromotion: {
          name: 'uat.01hz9w0z1y2x3w4v5u6t7s8r9q.e2d1c0b',
          finishedAt: minutesAgo(520),
          status: { phase: 'Succeeded' },
        },
        freightHistory: [
          {
            id: 'fh-uat-1',
            items: {
              main: {
                name: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
                origin: { kind: 'Warehouse', name: 'main' },
                images: [guestbookImage],
                commits: [demoCommit],
              },
            },
            verificationHistory: [{ id: 'v2', phase: 'Running' }],
          },
        ],
      },
    },
    {
      metadata: {
        name: 'prod',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(10_000),
      },
      status: {
        health: {
          status: 'Unhealthy',
          issues: ['Argo CD Application "guestbook-prod" is Degraded'],
        },
        autoPromotionEnabled: false,
        lastPromotion: {
          name: 'prod.01hz9v8y7x6w5v4u3t2s1r0q9p.e2d1c0b',
          finishedAt: minutesAgo(500),
          status: { phase: 'Succeeded' },
        },
        freightHistory: [
          {
            id: 'fh-prod-1',
            items: {
              main: {
                name: 'e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3',
                origin: { kind: 'Warehouse', name: 'main' },
                images: [{ ...guestbookImage, tag: 'v0.4.1' }],
              },
            },
            verificationHistory: [
              {
                id: 'v3',
                phase: 'Failed',
                message: 'Smoke test returned HTTP 503',
              },
            ],
          },
        ],
      },
    },
  ] as KargoStage[],

  promotions: [
    {
      metadata: {
        name: 'uat.01hz9y1a2b3c4d5e6f7g8h9i0j.f3c2a1b',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(5),
      },
      spec: {
        stage: 'uat',
        freight: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
      },
      status: {
        phase: 'Running',
        startedAt: minutesAgo(5),
        currentStep: 2,
        freight: {
          name: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
          origin: { kind: 'Warehouse', name: 'main' },
          images: [guestbookImage],
        },
      },
    },
    {
      metadata: {
        name: 'test.01hz9x7v8k2m3n4p5q6r7s8t9u.f3c2a1b',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(85),
      },
      spec: {
        stage: 'test',
        freight: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
      },
      status: {
        phase: 'Succeeded',
        startedAt: minutesAgo(85),
        finishedAt: minutesAgo(80),
        freight: {
          name: 'f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
          origin: { kind: 'Warehouse', name: 'main' },
          images: [guestbookImage],
          commits: [demoCommit],
        },
      },
    },
    {
      metadata: {
        name: 'prod.01hz9u5t4s3r2q1p0o9n8m7l6k.d1c0b9a',
        namespace: 'kargo-demo',
        creationTimestamp: minutesAgo(700),
      },
      spec: {
        stage: 'prod',
        freight: 'd1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2',
      },
      status: {
        phase: 'Failed',
        message: 'step 1 [argocd-update] failed: application sync timed out',
        startedAt: minutesAgo(700),
        finishedAt: minutesAgo(690),
        freight: {
          name: 'd1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2',
          origin: { kind: 'Warehouse', name: 'main' },
          images: [{ ...guestbookImage, tag: 'v0.4.0' }],
        },
      },
    },
  ] as KargoPromotion[],
};

/**
 * An in-memory {@link KargoApi} that serves {@link mockKargoData}.
 *
 * @public
 */
export class MockKargoApi implements KargoApi {
  constructor(private readonly data = mockKargoData) {}

  async listInstances() {
    return this.data.instances;
  }

  async listProjects() {
    return { items: this.data.projects, total: this.data.projects.length };
  }

  async getProject(project: string) {
    return this.find(this.data.projects, project);
  }

  async listStages() {
    return this.data.stages;
  }

  async getStage(_project: string, stage: string) {
    return this.find(this.data.stages, stage);
  }

  async listPromotions(_project: string, options?: { stage?: string }) {
    if (options?.stage) {
      return this.data.promotions.filter(p => p.spec.stage === options.stage);
    }
    return this.data.promotions;
  }

  async getPromotion(_project: string, promotion: string) {
    return this.find(this.data.promotions, promotion);
  }

  async queryFreight() {
    return this.data.freight;
  }

  async getFreight(_project: string, nameOrAlias: string) {
    const match = this.data.freight.find(
      f => f.metadata.name === nameOrAlias || f.alias === nameOrAlias,
    );
    if (!match) {
      throw new Error(`Freight "${nameOrAlias}" not found`);
    }
    return match;
  }

  async listWarehouses() {
    return this.data.warehouses;
  }

  async getWarehouse(_project: string, warehouse: string) {
    return this.find(this.data.warehouses, warehouse);
  }

  private find<T extends { metadata: { name: string } }>(
    items: T[],
    name: string,
  ): T {
    const match = items.find(item => item.metadata.name === name);
    if (!match) {
      throw new Error(`"${name}" not found`);
    }
    return match;
  }
}
