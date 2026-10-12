/**
 * The Kargo backend plugin for Backstage.
 *
 * @packageDocumentation
 */

export { kargoPlugin as default, kargoPlugin } from './plugin';
export { createRouter } from './router';
export type { RouterOptions } from './router';
export { KargoClient } from './KargoClient';
export type { KargoClientOptions, QueryFreightOptions } from './KargoClient';
export { createKargoService } from './services/KargoService';
export type {
  KargoService,
  KargoServiceOptions,
} from './services/KargoService';
export { readKargoConfig } from './config';
export type {
  KargoInstanceAuth,
  KargoInstanceConfig,
  KargoPluginConfig,
} from './config';
