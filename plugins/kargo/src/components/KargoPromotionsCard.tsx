import { Link, Table, TableColumn } from '@backstage/core-components';
import { Tooltip, Typography } from '@material-ui/core';
import {
  KargoPromotion,
  kargoUiLinks,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { useMemo } from 'react';
import {
  useKargoEntityInfo,
  useKargoInstance,
  useKargoPromotions,
} from '../hooks';
import { FreightArtifacts, FreightLink, RelativeTime } from './Freight';
import { KargoCard } from './KargoCard';
import { PromotionPhase } from './StatusIndicators';

/**
 * Props for {@link KargoPromotionsCard}.
 *
 * @public
 */
export interface KargoPromotionsCardProps {
  title?: string;
  variant?: 'gridItem' | 'fullHeight' | 'flex';
  refreshIntervalMs?: number;
  /** The maximum number of Promotions to show. Default: 20. */
  limit?: number;
}

/**
 * A table of recent Promotions, newest first.
 *
 * @public
 */
export function KargoPromotionsCard(props: KargoPromotionsCardProps) {
  const info = useKargoEntityInfo();
  const result = useKargoPromotions(info, {
    refreshIntervalMs: props.refreshIntervalMs,
    limit: props.limit ?? 20,
  });
  const instance = useKargoInstance(info);
  const uiUrl = instance.value?.url;
  const project = info.project;

  const columns = useMemo<TableColumn<KargoPromotion>[]>(
    () => [
      {
        title: 'Promotion',
        field: 'metadata.name',
        highlight: true,
        render: promotion =>
          uiUrl && project ? (
            <Link
              to={kargoUiLinks.promotion(
                uiUrl,
                project,
                promotion.metadata.name,
              )}
            >
              {promotion.metadata.name}
            </Link>
          ) : (
            promotion.metadata.name
          ),
      },
      {
        title: 'Stage',
        field: 'spec.stage',
        render: promotion =>
          uiUrl && project ? (
            <Link to={kargoUiLinks.stage(uiUrl, project, promotion.spec.stage)}>
              {promotion.spec.stage}
            </Link>
          ) : (
            promotion.spec.stage
          ),
      },
      {
        title: 'Phase',
        field: 'status.phase',
        render: promotion => {
          const indicator = <PromotionPhase phase={promotion.status?.phase} />;
          if (!promotion.status?.message) {
            return indicator;
          }
          return (
            <Tooltip title={promotion.status.message}>
              <span>{indicator}</span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Freight',
        sorting: false,
        render: promotion => {
          const freight = promotion.status?.freight ?? {
            name: promotion.spec.freight,
          };
          return (
            <>
              {project && (
                <FreightLink
                  freight={freight}
                  project={project}
                  uiUrl={uiUrl}
                />
              )}
              <div>
                <FreightArtifacts freight={promotion.status?.freight} />
              </div>
            </>
          );
        },
      },
      {
        title: 'Started',
        field: 'metadata.creationTimestamp',
        defaultSort: 'desc',
        render: promotion => (
          <RelativeTime
            value={
              promotion.status?.startedAt ??
              promotion.metadata.creationTimestamp
            }
          />
        ),
      },
      {
        title: 'Finished',
        field: 'status.finishedAt',
        render: promotion => (
          <RelativeTime value={promotion.status?.finishedAt} />
        ),
      },
    ],
    [uiUrl, project],
  );

  return (
    <KargoCard
      title={props.title ?? 'Kargo promotions'}
      subheader={project ? `Project: ${project}` : undefined}
      project={project}
      variant={props.variant}
      deepLink={
        uiUrl && project
          ? {
              title: 'Open in Kargo',
              link: kargoUiLinks.project(uiUrl, project),
            }
          : undefined
      }
      result={result}
    >
      {promotions => (
        <Table<KargoPromotion>
          options={{
            paging: promotions.length > 10,
            pageSize: 10,
            search: false,
            toolbar: false,
            padding: 'dense',
          }}
          data={promotions}
          columns={columns}
          emptyContent={
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ padding: 16 }}
            >
              No Promotions found in project {project}.
            </Typography>
          }
        />
      )}
    </KargoCard>
  );
}
