import { Grid } from '@material-ui/core';
import { KargoPromotionsCard } from './KargoPromotionsCard';
import { KargoStagesCard } from './KargoStagesCard';
import { KargoWarehousesCard } from './KargoWarehousesCard';

/**
 * Props for {@link KargoEntityContent}.
 *
 * @public
 */
export interface KargoEntityContentProps {
  refreshIntervalMs?: number;
  /** The maximum number of Promotions to show. Default: 50. */
  promotionLimit?: number;
}

/**
 * The full Kargo tab for an entity page. It shows Stages, Warehouses, and
 * recent Promotions.
 *
 * @public
 */
export function KargoEntityContent(props: KargoEntityContentProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <KargoStagesCard refreshIntervalMs={props.refreshIntervalMs} />
      </Grid>
      <Grid item xs={12}>
        <KargoWarehousesCard refreshIntervalMs={props.refreshIntervalMs} />
      </Grid>
      <Grid item xs={12}>
        <KargoPromotionsCard
          refreshIntervalMs={props.refreshIntervalMs}
          limit={props.promotionLimit ?? 50}
        />
      </Grid>
    </Grid>
  );
}
