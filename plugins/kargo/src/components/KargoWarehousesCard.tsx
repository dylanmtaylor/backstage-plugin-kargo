import { Link, Table, TableColumn } from '@backstage/core-components';
import { Tooltip, Typography } from '@material-ui/core';
import {
  KargoWarehouse,
  kargoUiLinks,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { useMemo } from 'react';
import {
  useKargoEntityInfo,
  useKargoInstance,
  useKargoWarehouses,
} from '../hooks';
import { RelativeTime } from './Freight';
import { KargoCard } from './KargoCard';
import { ConditionStatus } from './StatusIndicators';

/**
 * Props for {@link KargoWarehousesCard}.
 *
 * @public
 */
export interface KargoWarehousesCardProps {
  title?: string;
  variant?: 'gridItem' | 'fullHeight' | 'flex';
  refreshIntervalMs?: number;
}

function findCondition(warehouse: KargoWarehouse, type: string) {
  return warehouse.status?.conditions?.find(c => c.type === type);
}

/**
 * A table of Warehouses with their health, readiness, and most recent Freight.
 *
 * @public
 */
export function KargoWarehousesCard(props: KargoWarehousesCardProps) {
  const info = useKargoEntityInfo();
  const result = useKargoWarehouses(info, {
    refreshIntervalMs: props.refreshIntervalMs,
  });
  const instance = useKargoInstance(info);
  const uiUrl = instance.value?.url;
  const project = info.project;

  const columns = useMemo<TableColumn<KargoWarehouse>[]>(
    () => [
      {
        title: 'Warehouse',
        field: 'metadata.name',
        highlight: true,
        render: warehouse =>
          uiUrl && project ? (
            <Link
              to={kargoUiLinks.warehouse(
                uiUrl,
                project,
                warehouse.metadata.name,
              )}
            >
              {warehouse.metadata.name}
            </Link>
          ) : (
            warehouse.metadata.name
          ),
      },
      {
        title: 'Status',
        sorting: false,
        render: warehouse => {
          const ready = findCondition(warehouse, 'Ready');
          const healthy = findCondition(warehouse, 'Healthy');
          const reconciling = findCondition(warehouse, 'Reconciling');
          const condition = ready ?? healthy;
          const label =
            reconciling?.status === 'True'
              ? 'Reconciling'
              : condition?.type ?? 'Unknown';
          const indicator = (
            <ConditionStatus status={condition?.status} label={label} />
          );
          const message = condition?.message ?? reconciling?.message;
          if (!message) {
            return indicator;
          }
          return (
            <Tooltip title={message}>
              <span>{indicator}</span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Subscriptions',
        sorting: false,
        render: warehouse => warehouse.spec?.subscriptions?.length ?? 0,
      },
      {
        title: 'Interval',
        field: 'spec.interval',
        render: warehouse => warehouse.spec?.interval ?? '—',
      },
      {
        title: 'Last freight',
        field: 'status.lastFreightID',
        render: warehouse => {
          const id = warehouse.status?.lastFreightID;
          if (!id) {
            return (
              <Typography variant="body2" color="textSecondary">
                None
              </Typography>
            );
          }
          return uiUrl && project ? (
            <Link to={kargoUiLinks.freight(uiUrl, project, id)}>
              {id.slice(0, 12)}
            </Link>
          ) : (
            id.slice(0, 12)
          );
        },
      },
      {
        title: 'Created',
        field: 'metadata.creationTimestamp',
        render: warehouse => (
          <RelativeTime value={warehouse.metadata.creationTimestamp} />
        ),
      },
    ],
    [uiUrl, project],
  );

  return (
    <KargoCard
      title={props.title ?? 'Kargo warehouses'}
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
      {warehouses => (
        <Table<KargoWarehouse>
          options={{
            paging: warehouses.length > 10,
            pageSize: 10,
            search: false,
            toolbar: false,
            padding: 'dense',
          }}
          data={warehouses}
          columns={columns}
          emptyContent={
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ padding: 16 }}
            >
              No Warehouses found in project {project}.
            </Typography>
          }
        />
      )}
    </KargoCard>
  );
}
