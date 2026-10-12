# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-12

### Added

- `@dylanmtaylor/backstage-plugin-kargo-common`: annotation constants, Kargo resource types, and helpers for Kargo UI links and Freight summaries.
- `@dylanmtaylor/backstage-plugin-kargo-backend`: a read-only proxy to the Kargo REST API (`/v1beta1`) with support for many instances, bearer token or admin password authentication, token refresh, request timeouts, response caching, and optional TLS verification skip.
- `@dylanmtaylor/backstage-plugin-kargo`: entity cards for Stages, Promotions, and Warehouses, a Kargo entity tab, hooks, a frontend API client, `MockKargoApi` for tests, and support for the legacy and new frontend systems.

[Unreleased]: https://github.com/dylanmtaylor/backstage-plugin-kargo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dylanmtaylor/backstage-plugin-kargo/releases/tag/v0.1.0
