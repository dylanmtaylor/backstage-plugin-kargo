/**
 * Annotation keys that the Kargo plugin reads from catalog entities.
 *
 * @public
 */
export const KARGO_ANNOTATIONS = {
  /**
   * Required. The Kargo Project that owns the Stages for this entity.
   */
  PROJECT: 'kargo.akuity.io/project',
  /**
   * Optional. A comma-separated list of Stage names. When absent, the plugin
   * shows every Stage in the Project.
   */
  STAGES: 'kargo.akuity.io/stages',
  /**
   * Optional. A comma-separated list of Warehouse names. When absent, the
   * plugin shows every Warehouse in the Project.
   */
  WAREHOUSES: 'kargo.akuity.io/warehouses',
  /**
   * Optional. The name of a configured Kargo instance. When absent, the plugin
   * uses the first configured instance.
   */
  INSTANCE: 'kargo.akuity.io/instance',
} as const;

/**
 * The annotation key for the Kargo Project.
 *
 * @public
 */
export const KARGO_PROJECT_ANNOTATION = KARGO_ANNOTATIONS.PROJECT;

/**
 * The annotation key for the Kargo Stage list.
 *
 * @public
 */
export const KARGO_STAGES_ANNOTATION = KARGO_ANNOTATIONS.STAGES;

/**
 * The annotation key for the Kargo Warehouse list.
 *
 * @public
 */
export const KARGO_WAREHOUSES_ANNOTATION = KARGO_ANNOTATIONS.WAREHOUSES;

/**
 * The annotation key for the Kargo instance name.
 *
 * @public
 */
export const KARGO_INSTANCE_ANNOTATION = KARGO_ANNOTATIONS.INSTANCE;

/**
 * Split a comma-separated annotation value into a list of trimmed names.
 * Empty values are removed.
 *
 * @public
 */
export function parseAnnotationList(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}
