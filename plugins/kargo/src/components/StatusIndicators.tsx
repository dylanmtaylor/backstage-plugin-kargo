import {
  StatusAborted,
  StatusError,
  StatusOK,
  StatusPending,
  StatusRunning,
  StatusWarning,
} from '@backstage/core-components';
import { normalizeHealth } from '@dylanmtaylor/backstage-plugin-kargo-common';

/**
 * Render a Stage health value with a status indicator.
 *
 * @public
 */
export function HealthStatus(props: { status?: string }) {
  const health = normalizeHealth(props.status);
  switch (health) {
    case 'Healthy':
      return <StatusOK>Healthy</StatusOK>;
    case 'Unhealthy':
      return <StatusError>Unhealthy</StatusError>;
    case 'Progressing':
      return <StatusRunning>Progressing</StatusRunning>;
    case 'NotApplicable':
      return <StatusAborted>N/A</StatusAborted>;
    default:
      return <StatusPending>Unknown</StatusPending>;
  }
}

/**
 * Render a Promotion phase with a status indicator.
 *
 * @public
 */
export function PromotionPhase(props: { phase?: string }) {
  const phase = props.phase ?? 'Unknown';
  switch (phase) {
    case 'Succeeded':
      return <StatusOK>{phase}</StatusOK>;
    case 'Running':
      return <StatusRunning>{phase}</StatusRunning>;
    case 'Pending':
      return <StatusPending>{phase}</StatusPending>;
    case 'Failed':
    case 'Errored':
      return <StatusError>{phase}</StatusError>;
    case 'Aborted':
      return <StatusAborted>{phase}</StatusAborted>;
    default:
      return <StatusWarning>{phase}</StatusWarning>;
  }
}

/**
 * Render a Verification phase with a status indicator.
 *
 * @public
 */
export function VerificationPhase(props: { phase?: string }) {
  const phase = props.phase;
  if (!phase) {
    return <StatusAborted>None</StatusAborted>;
  }
  switch (phase) {
    case 'Successful':
      return <StatusOK>{phase}</StatusOK>;
    case 'Running':
      return <StatusRunning>{phase}</StatusRunning>;
    case 'Pending':
      return <StatusPending>{phase}</StatusPending>;
    case 'Failed':
    case 'Error':
      return <StatusError>{phase}</StatusError>;
    case 'Aborted':
      return <StatusAborted>{phase}</StatusAborted>;
    default:
      return <StatusWarning>{phase}</StatusWarning>;
  }
}

/**
 * Render a Kubernetes condition status with an indicator.
 *
 * @public
 */
export function ConditionStatus(props: { status?: string; label: string }) {
  switch (props.status) {
    case 'True':
      return <StatusOK>{props.label}</StatusOK>;
    case 'False':
      return <StatusError>{props.label}</StatusError>;
    default:
      return <StatusPending>{props.label}</StatusPending>;
  }
}
