import { Link, Table, TableColumn } from '@backstage/core-components';
import { Tooltip, Typography } from '@material-ui/core';
import {
  KargoStage,
  kargoUiLinks,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { useMemo } from 'react';
import { useKargoEntityInfo, useKargoInstance, useKargoStages } from '../hooks';
import { FreightArtifacts, FreightLink, RelativeTime } from './Freight';
import { KargoCard } from './KargoCard';
import {
  HealthStatus,
  PromotionPhase,
  VerificationPhase,
} from './StatusIndicators';

/**
 * Props for {@link KargoStagesCard}.
 *
 * @public
 */
export interface KargoStagesCardProps {
  title?: string;
  variant?: 'gridItem' | 'fullHeight' | 'flex';
  refreshIntervalMs?: number;
}

function currentFreightOf(stage: KargoStage) {
  const current = stage.status?.freightHistory?.[0];
  if (!current?.items) {
    return [];
  }
  return Object.values(current.items);
}

function latestVerification(stage: KargoStage) {
  return stage.status?.freightHistory?.[0]?.verificationHistory?.[0];
}

/**
 * A table of Stages with health, current Freight, last Promotion, and the
 * latest verification result.
 *
 * @public
 */
export function KargoStagesCard(props: KargoStagesCardProps) {
  const info = useKargoEntityInfo();
  const result = useKargoStages(info, {
    refreshIntervalMs: props.refreshIntervalMs,
  });
  const instance = useKargoInstance(info);
  const uiUrl = instance.value?.url;
  const project = info.project;

  const columns = useMemo<TableColumn<KargoStage>[]>(
    () => [
      {
        title: 'Stage',
        field: 'metadata.name',
        highlight: true,
        render: stage =>
          uiUrl && project ? (
            <Link to={kargoUiLinks.stage(uiUrl, project, stage.metadata.name)}>
              {stage.metadata.name}
            </Link>
          ) : (
            stage.metadata.name
          ),
      },
      {
        title: 'Health',
        field: 'status.health.status',
        render: stage => {
          const issues = stage.status?.health?.issues ?? [];
          const indicator = (
            <HealthStatus status={stage.status?.health?.status} />
          );
          if (issues.length === 0) {
            return indicator;
          }
          return (
            <Tooltip title={issues.join('\n')}>
              <span>{indicator}</span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Current freight',
        sorting: false,
        render: stage => {
          const items = currentFreightOf(stage);
          if (items.length === 0) {
            return (
              <Typography variant="body2" color="textSecondary">
                None
              </Typography>
            );
          }
          return (
            <>
              {items.map(item => (
                <div key={item.name ?? item.origin?.name}>
                  {project && (
                    <FreightLink
                      freight={item}
                      project={project}
                      uiUrl={uiUrl}
                    />
                  )}
                  <div>
                    <FreightArtifacts freight={item} />
                  </div>
                </div>
              ))}
            </>
          );
        },
      },
      {
        title: 'Last promotion',
        field: 'status.lastPromotion.finishedAt',
        render: stage => {
          const active = stage.status?.currentPromotion;
          const last = stage.status?.lastPromotion;
          const promotion = active ?? last;
          if (!promotion) {
            return (
              <Typography variant="body2" color="textSecondary">
                None
              </Typography>
            );
          }
          const phase = active ? 'Running' : last?.status?.phase;
          return (
            <>
              <PromotionPhase phase={phase} />
              <div>
                {uiUrl && project ? (
                  <Link
                    to={kargoUiLinks.promotion(uiUrl, project, promotion.name)}
                  >
                    <RelativeTime value={promotion.finishedAt} />
                  </Link>
                ) : (
                  <RelativeTime value={promotion.finishedAt} />
                )}
              </div>
            </>
          );
        },
      },
      {
        title: 'Verification',
        sorting: false,
        render: stage => {
          const verification = latestVerification(stage);
          const indicator = <VerificationPhase phase={verification?.phase} />;
          if (!verification?.message) {
            return indicator;
          }
          return (
            <Tooltip title={verification.message}>
              <span>{indicator}</span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Auto-promote',
        field: 'status.autoPromotionEnabled',
        type: 'boolean',
        render: stage => (stage.status?.autoPromotionEnabled ? 'Yes' : 'No'),
      },
    ],
    [uiUrl, project],
  );

  return (
    <KargoCard
      title={props.title ?? 'Kargo stages'}
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
      {stages => (
        <Table<KargoStage>
          options={{
            paging: stages.length > 10,
            pageSize: 10,
            search: false,
            toolbar: false,
            padding: 'dense',
          }}
          data={stages}
          columns={columns}
          emptyContent={
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ padding: 16 }}
            >
              No Stages found in project {project}.
            </Typography>
          }
        />
      )}
    </KargoCard>
  );
}
