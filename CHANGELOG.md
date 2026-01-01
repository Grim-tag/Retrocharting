# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-12-31

### Security
- **Admin Dashboard**: Removed hardcoded `ADMIN_KEY` from `AdminClient.tsx`.
- **Admin Dashboard**: Implemented strict RBAC access control using `AuthContext`.
- **Admin Dashboard**: Enforced `user.is_admin` check on client-side, redirecting unauthorized users to home.
- **Admin Dashboard**: Updated all API calls to use `Authorization: Bearer` token instead of secret header.

### Fixed
- **Routing**: Resolved 404 errors on default locale routes (e.g. `/games/[slug]`) by restoring correct `middleware.ts` logic.
- **Routing**: Middleware now correctly rewrites default locale paths (missing prefix) to internal `/en/...` paths.
- **Routing**: Fixed `middleware.ts` to properly exclude `sitemap.xml` and `robots.txt` from localization logic.

## [2026-01-01] Phase 2: Migration & Optimization

### Added
- **Frontend / SEO**: Implemented Smart Redirections (307/308) in `page.tsx`. Legacy Product URLs now auto-redirect to the new Unified Game Page if a link exists, preserving SEO juice.
- **Backend / API**: Enriched `/products/{id}` response with `game_slug` to facilitate frontend redirections.
- **Backend / API**: Implemented new `/games` Router (`GET /api/v1/games/{slug}`) to serve unified Game Pages with aggregated regional variants.
- **Backend / Fusion**: Implemented "Broom Sweep" logic in Consolidation Engine to forces the creation of a Game entry for "Orphan" items, ensuring 100% database coverage.
- **Admin Dashboard**: Introduced Tabbed Interface (Dashboard, Amazon, Users, System) and restored missing backend functionality.
- **Admin Dashboard**: Created `AmazonStats`, `UsersTable`, and `SystemTools` components.

### Fixed
- **Backend**: Restored missing `refresh_prices_job` in `enrichment.py` (Scheduler Fix).
- **Backend**: Removed "Collector" keyword veto logic which caused an **Infinite Loop**.
- **Backend**: Fixed critical Memory Leak (Status 134) in Consolidation Job (`expunge_all`).
- **Backend**: Optimized Consolidation with Batch Processing to fix `psycopg2.ProgrammingError`.
- **Backend**: Promoted `/consolidation/run` to Background Task to prevent HTTP Timeouts.

### Changed
- **Fusion Logic**: Updated logic to prioritize **NTSC/Clean Titles** for Global Game Pages.
- **Performance**: Removed expensive `count()` and `order_by` from Consolidation start-up.
- **Documentation**: Initialized `CHANGELOG.md` to track project history.

## [Previous Sessions]
*(Reconstructed history based on recent context)*

### 2025-12-30
- **Debugging**: Investigated 404 Routing issues.

### 2025-12-20
- **Amazon**: Implemented Regional Pricing Logic (NTSC/PAL/JP).
- **ListingClassifier**: Enhanced logic to auto-detect region based on domain.

### 2025-12-26 to 2025-12-29
- **Android App**: Configuration and Validation of the Capacitor/Android Studio project.
- **Mobile app**: Migrated to `html5-qrcode` to resolve camera permission issues on Android.
- **Scanner**: Implemented "Scan to Add" and "Scan to Link" features for contributing unknown barcodes.
- **Scanner**: Created `ScannerModal` for a unified scanning experience (Camera/File/Manual Entry).
