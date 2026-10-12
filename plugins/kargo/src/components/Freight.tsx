import { Link } from '@backstage/core-components';
import { Chip, Tooltip, Typography } from '@material-ui/core';
import {
  KargoFreight,
  KargoFreightReference,
  freightDisplayName,
  kargoUiLinks,
  summarizeFreightArtifacts,
} from '@dylanmtaylor/backstage-plugin-kargo-common';
import { DateTime } from 'luxon';

/**
 * Render a short list of artifact chips for a piece of Freight.
 *
 * @public
 */
export function FreightArtifacts(props: {
  freight?: KargoFreight | KargoFreightReference;
  max?: number;
}) {
  const labels = summarizeFreightArtifacts(props.freight);
  if (labels.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No artifacts
      </Typography>
    );
  }
  const max = props.max ?? 3;
  const shown = labels.slice(0, max);
  const hidden = labels.slice(max);
  return (
    <>
      {shown.map(label => (
        <Chip
          key={label}
          label={label}
          size="small"
          variant="outlined"
          style={{ marginBottom: 0 }}
        />
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.join(', ')}>
          <Chip
            label={`+${hidden.length}`}
            size="small"
            style={{ marginBottom: 0 }}
          />
        </Tooltip>
      )}
    </>
  );
}

/**
 * Render a link to a piece of Freight in the Kargo UI.
 *
 * @public
 */
export function FreightLink(props: {
  freight?: KargoFreight | KargoFreightReference;
  project: string;
  uiUrl?: string;
}) {
  const name = freightDisplayName(props.freight);
  if (!name) {
    return (
      <Typography variant="body2" color="textSecondary">
        None
      </Typography>
    );
  }
  // Freight names are 40 character hashes. Show a short form when there is
  // no alias and keep the full name in a tooltip.
  const label = isFreightHash(name) ? name.slice(0, 12) : name;
  const content = props.uiUrl ? (
    <Link to={kargoUiLinks.freight(props.uiUrl, props.project, name)}>
      {label}
    </Link>
  ) : (
    <Typography variant="body2" component="span">
      {label}
    </Typography>
  );
  if (label === name) {
    return content;
  }
  return (
    <Tooltip title={name}>
      <span>{content}</span>
    </Tooltip>
  );
}

function isFreightHash(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

/**
 * Render a timestamp as a relative time with the absolute value in a tooltip.
 *
 * @public
 */
export function RelativeTime(props: { value?: string }) {
  if (!props.value) {
    return (
      <Typography variant="body2" color="textSecondary">
        —
      </Typography>
    );
  }
  const date = DateTime.fromISO(props.value);
  if (!date.isValid) {
    return <Typography variant="body2">{props.value}</Typography>;
  }
  return (
    <Tooltip title={date.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}>
      <Typography variant="body2" component="span">
        {date.toRelative()}
      </Typography>
    </Tooltip>
  );
}
