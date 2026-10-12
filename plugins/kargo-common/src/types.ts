/**
 * Kubernetes ObjectMeta fields that the plugin reads.
 *
 * @public
 */
export interface KargoObjectMeta {
  name: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  resourceVersion?: string;
  generation?: number;
}

/**
 * A Kubernetes condition.
 *
 * @public
 */
export interface KargoCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown' | string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

/**
 * The health status values a Stage can report.
 *
 * @public
 */
export type KargoHealthState =
  | 'Healthy'
  | 'Unhealthy'
  | 'Progressing'
  | 'NotApplicable'
  | 'Unknown';

/**
 * The lifecycle phases of a Promotion.
 *
 * @public
 */
export type KargoPromotionPhase =
  | 'Pending'
  | 'Running'
  | 'Succeeded'
  | 'Failed'
  | 'Errored'
  | 'Aborted';

/**
 * The lifecycle phases of a Verification.
 *
 * @public
 */
export type KargoVerificationPhase =
  | 'Pending'
  | 'Running'
  | 'Successful'
  | 'Failed'
  | 'Error'
  | 'Aborted'
  | 'Inconclusive';

/**
 * The origin of a piece of Freight.
 *
 * @public
 */
export interface KargoFreightOrigin {
  kind: 'Warehouse' | string;
  name: string;
}

/**
 * A Git commit tracked by Freight.
 *
 * @public
 */
export interface KargoGitCommit {
  repoURL: string;
  id: string;
  branch?: string;
  tag?: string;
  message?: string;
  author?: string;
  committer?: string;
  subscriptionName?: string;
}

/**
 * A container image tracked by Freight.
 *
 * @public
 */
export interface KargoImage {
  repoURL: string;
  tag?: string;
  digest?: string;
  annotations?: Record<string, string>;
  subscriptionName?: string;
}

/**
 * A Helm chart tracked by Freight.
 *
 * @public
 */
export interface KargoChart {
  repoURL: string;
  name?: string;
  version: string;
  subscriptionName?: string;
}

/**
 * A generic artifact tracked by Freight.
 *
 * @public
 */
export interface KargoArtifactReference {
  artifactType?: string;
  version?: string;
  subscriptionName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * A reference to a piece of Freight.
 *
 * @public
 */
export interface KargoFreightReference {
  name?: string;
  origin?: KargoFreightOrigin;
  commits?: KargoGitCommit[];
  images?: KargoImage[];
  charts?: KargoChart[];
  artifacts?: KargoArtifactReference[];
}

/**
 * Information about one verification run.
 *
 * @public
 */
export interface KargoVerificationInfo {
  id?: string;
  actor?: string;
  phase?: KargoVerificationPhase | string;
  message?: string;
  startTime?: string;
  finishTime?: string;
  analysisRun?: {
    name: string;
    namespace?: string;
    phase?: string;
  };
}

/**
 * A collection of Freight indexed by Warehouse name.
 *
 * @public
 */
export interface KargoFreightCollection {
  id?: string;
  items?: Record<string, KargoFreightReference>;
  verificationHistory?: KargoVerificationInfo[];
}

/**
 * The health of a Stage.
 *
 * @public
 */
export interface KargoHealth {
  status?: KargoHealthState | string;
  issues?: string[];
  config?: unknown;
  output?: unknown;
}

/**
 * A reference from a Stage to a Promotion.
 *
 * @public
 */
export interface KargoPromotionReference {
  name: string;
  freight?: KargoFreightReference;
  finishedAt?: string;
  status?: KargoPromotionStatus;
}

/**
 * The status of a Stage.
 *
 * @public
 */
export interface KargoStageStatus {
  health?: KargoHealth;
  conditions?: KargoCondition[];
  freightHistory?: KargoFreightCollection[];
  freightSummary?: string;
  lastPromotion?: KargoPromotionReference;
  currentPromotion?: KargoPromotionReference;
  autoPromotionEnabled?: boolean;
  observedGeneration?: number;
  lastHandledRefresh?: string;
  metadata?: Record<string, string>;
}

/**
 * Sources of requested Freight for a Stage.
 *
 * @public
 */
export interface KargoFreightSources {
  direct?: boolean;
  stages?: string[];
  requiredSoakTime?: string;
  availabilityStrategy?: string;
}

/**
 * A request for Freight by a Stage.
 *
 * @public
 */
export interface KargoFreightRequest {
  origin?: KargoFreightOrigin;
  sources?: KargoFreightSources;
}

/**
 * The spec of a Stage.
 *
 * @public
 */
export interface KargoStageSpec {
  shard?: string;
  requestedFreight?: KargoFreightRequest[];
  promotionTemplate?: unknown;
  verification?: unknown;
}

/**
 * A Kargo Stage resource.
 *
 * @public
 */
export interface KargoStage {
  apiVersion?: string;
  kind?: 'Stage' | string;
  metadata: KargoObjectMeta;
  spec?: KargoStageSpec;
  status?: KargoStageStatus;
}

/**
 * One step of a Promotion.
 *
 * @public
 */
export interface KargoPromotionStep {
  uses?: string;
  as?: string;
  task?: { name: string; kind?: string };
  config?: unknown;
}

/**
 * Metadata about the execution of one Promotion step.
 *
 * @public
 */
export interface KargoStepExecutionMetadata {
  alias?: string;
  status?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  errorCount?: number;
}

/**
 * The spec of a Promotion.
 *
 * @public
 */
export interface KargoPromotionSpec {
  stage: string;
  freight: string;
  steps?: KargoPromotionStep[];
}

/**
 * The status of a Promotion.
 *
 * @public
 */
export interface KargoPromotionStatus {
  phase?: KargoPromotionPhase | string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  currentStep?: number;
  freight?: KargoFreightReference;
  freightCollection?: KargoFreightCollection;
  stepExecutionMetadata?: KargoStepExecutionMetadata[];
  lastHandledRefresh?: string;
}

/**
 * A Kargo Promotion resource.
 *
 * @public
 */
export interface KargoPromotion {
  apiVersion?: string;
  kind?: 'Promotion' | string;
  metadata: KargoObjectMeta;
  spec: KargoPromotionSpec;
  status?: KargoPromotionStatus;
}

/**
 * A record of a Stage that has approved, verified, or received Freight.
 *
 * @public
 */
export interface KargoFreightStageRecord {
  since?: string;
  longestCompletedSoak?: string;
}

/**
 * The status of a piece of Freight.
 *
 * @public
 */
export interface KargoFreightStatus {
  currentlyIn?: Record<string, KargoFreightStageRecord>;
  verifiedIn?: Record<string, KargoFreightStageRecord>;
  approvedFor?: Record<string, KargoFreightStageRecord>;
  metadata?: Record<string, string>;
}

/**
 * A Kargo Freight resource.
 *
 * @public
 */
export interface KargoFreight {
  apiVersion?: string;
  kind?: 'Freight' | string;
  metadata: KargoObjectMeta;
  alias?: string;
  origin?: KargoFreightOrigin;
  commits?: KargoGitCommit[];
  images?: KargoImage[];
  charts?: KargoChart[];
  artifacts?: KargoArtifactReference[];
  discoveredAt?: string;
  status?: KargoFreightStatus;
}

/**
 * The status of a Warehouse.
 *
 * @public
 */
export interface KargoWarehouseStatus {
  conditions?: KargoCondition[];
  lastFreightID?: string;
  observedGeneration?: number;
  lastHandledRefresh?: string;
  discoveredArtifacts?: unknown;
}

/**
 * A Kargo Warehouse resource.
 *
 * @public
 */
export interface KargoWarehouse {
  apiVersion?: string;
  kind?: 'Warehouse' | string;
  metadata: KargoObjectMeta;
  spec?: {
    interval?: string;
    freightCreationPolicy?: string;
    subscriptions?: unknown[];
  };
  status?: KargoWarehouseStatus;
}

/**
 * A Kargo Project resource.
 *
 * @public
 */
export interface KargoProject {
  apiVersion?: string;
  kind?: 'Project' | string;
  metadata: KargoObjectMeta;
  status?: {
    conditions?: KargoCondition[];
  };
}

/**
 * A configured Kargo instance, as reported to the frontend. Credentials are
 * never included.
 *
 * @public
 */
export interface KargoInstanceInfo {
  name: string;
  url: string;
}
