import {
  InfoCard,
  MissingAnnotationEmptyState,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { Link } from '@backstage/core-components';
import { KARGO_ANNOTATIONS } from '@dylanmtaylor/backstage-plugin-kargo-common';
import { ReactNode } from 'react';
import { KargoAsyncResult } from '../hooks';

/**
 * Props for {@link KargoCard}.
 *
 * @public
 */
export interface KargoCardProps<T> {
  title: string;
  subheader?: ReactNode;
  /** Set when the entity lacks the project annotation. */
  project?: string;
  /** A link into the Kargo UI shown in the card header. */
  deepLink?: { title: string; link: string };
  result: KargoAsyncResult<T>;
  children: (value: T) => ReactNode;
  variant?: 'gridItem' | 'fullHeight' | 'flex';
}

/**
 * A card wrapper that renders the shared loading, error, and missing
 * annotation states for Kargo data.
 *
 * @public
 */
export function KargoCard<T>(props: KargoCardProps<T>) {
  const { title, subheader, project, deepLink, result, children, variant } =
    props;

  if (!project) {
    return (
      <InfoCard title={title} variant={variant}>
        <MissingAnnotationEmptyState annotation={KARGO_ANNOTATIONS.PROJECT} />
      </InfoCard>
    );
  }

  let body: ReactNode;
  if (result.loading && result.value === undefined) {
    body = <Progress />;
  } else if (result.error) {
    body = <ResponseErrorPanel error={result.error} />;
  } else if (result.value !== undefined) {
    body = children(result.value);
  } else {
    body = null;
  }

  return (
    <InfoCard
      title={title}
      subheader={subheader}
      variant={variant}
      deepLink={deepLink}
      noPadding
    >
      {body}
    </InfoCard>
  );
}

/**
 * A plain link that opens in a new tab.
 *
 * @public
 */
export function ExternalLink(props: { href: string; children: ReactNode }) {
  return (
    <Link to={props.href} target="_blank" rel="noopener noreferrer">
      {props.children}
    </Link>
  );
}
