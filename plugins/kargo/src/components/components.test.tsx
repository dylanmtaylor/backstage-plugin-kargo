import { Entity } from '@backstage/catalog-model';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { KARGO_ANNOTATIONS } from '@dylanmtaylor/backstage-plugin-kargo-common';
import { ReactNode } from 'react';
import { kargoApiRef, KargoApi } from '../api';
import { MockKargoApi } from '../testUtils';
import { KargoPromotionsCard } from './KargoPromotionsCard';
import { KargoStagesCard } from './KargoStagesCard';
import { KargoWarehousesCard } from './KargoWarehousesCard';
import { KargoEntityContent } from './KargoEntityContent';

const annotatedEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'guestbook',
    annotations: { [KARGO_ANNOTATIONS.PROJECT]: 'kargo-demo' },
  },
};

const filteredEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'guestbook',
    annotations: {
      [KARGO_ANNOTATIONS.PROJECT]: 'kargo-demo',
      [KARGO_ANNOTATIONS.STAGES]: 'prod',
    },
  },
};

const bareEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'nothing' },
};

function render(
  ui: ReactNode,
  options: { entity?: Entity; api?: KargoApi } = {},
) {
  return renderInTestApp(
    <TestApiProvider apis={[[kargoApiRef, options.api ?? new MockKargoApi()]]}>
      <EntityProvider entity={options.entity ?? annotatedEntity}>
        {ui}
      </EntityProvider>
    </TestApiProvider>,
  );
}

describe('KargoStagesCard', () => {
  it('renders stages with health and freight', async () => {
    await render(<KargoStagesCard />);

    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());
    expect(screen.getByText('uat')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Progressing')).toBeInTheDocument();
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    expect(screen.getAllByText('guestbook:v0.4.2').length).toBeGreaterThan(0);
    expect(screen.getByText('Project: kargo-demo')).toBeInTheDocument();
  });

  it('shortens freight hashes that have no alias', async () => {
    await render(<KargoStagesCard />);
    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());
    const links = screen.getAllByText('f3c2a1b0d9e8');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].closest('a')).toHaveAttribute(
      'href',
      'https://kargo.example.com/project/kargo-demo/freight/f3c2a1b0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
    );
  });

  it('links to the Kargo UI', async () => {
    await render(<KargoStagesCard />);
    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());
    const stageLink = screen.getByText('test').closest('a');
    expect(stageLink).toHaveAttribute(
      'href',
      'https://kargo.example.com/project/kargo-demo/stage/test',
    );
    expect(screen.getByText('Open in Kargo').closest('a')).toHaveAttribute(
      'href',
      'https://kargo.example.com/project/kargo-demo',
    );
  });

  it('filters stages by the stages annotation', async () => {
    await render(<KargoStagesCard />, { entity: filteredEntity });
    await waitFor(() => expect(screen.getByText('prod')).toBeInTheDocument());
    expect(screen.queryByText('test')).not.toBeInTheDocument();
    expect(screen.queryByText('uat')).not.toBeInTheDocument();
  });

  it('shows the missing annotation state', async () => {
    await render(<KargoStagesCard />, { entity: bareEntity });
    expect(screen.getByText('Missing Annotation')).toBeInTheDocument();
    expect(
      screen.getAllByText(KARGO_ANNOTATIONS.PROJECT, { exact: false }).length,
    ).toBeGreaterThan(0);
  });

  it('shows an error panel when the API fails', async () => {
    const api = new MockKargoApi();
    api.listStages = async () => {
      throw new Error('kaboom');
    };
    await render(<KargoStagesCard />, { api });
    await waitFor(() =>
      expect(screen.getAllByText(/kaboom/).length).toBeGreaterThan(0),
    );
  });
});

describe('KargoPromotionsCard', () => {
  it('renders promotions with phases', async () => {
    await render(<KargoPromotionsCard />);
    await waitFor(() =>
      expect(screen.getByText('Running')).toBeInTheDocument(),
    );
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText('uat.01hz9y1a2b3c4d5e6f7g8h9i0j.f3c2a1b'),
    ).toBeInTheDocument();
  });

  it('uses the stage filter for a single stage', async () => {
    const api = new MockKargoApi();
    const spy = jest.spyOn(api, 'listPromotions');
    await render(<KargoPromotionsCard />, { entity: filteredEntity, api });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('kargo-demo', {
      instance: undefined,
      stage: 'prod',
    });
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });
});

describe('KargoWarehousesCard', () => {
  it('renders warehouses', async () => {
    await render(<KargoWarehousesCard />);
    await waitFor(() => expect(screen.getByText('main')).toBeInTheDocument());
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('5m0s')).toBeInTheDocument();
    expect(screen.getByText('main').closest('a')).toHaveAttribute(
      'href',
      'https://kargo.example.com/project/kargo-demo/warehouse/main',
    );
  });
});

describe('KargoEntityContent', () => {
  it('renders all three sections', async () => {
    await render(<KargoEntityContent />);
    await waitFor(() =>
      expect(screen.getByText('Kargo stages')).toBeInTheDocument(),
    );
    expect(screen.getByText('Kargo warehouses')).toBeInTheDocument();
    expect(screen.getByText('Kargo promotions')).toBeInTheDocument();
  });
});
