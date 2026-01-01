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

### Added
- **Admin Dashboard**: Introduced Tabbed Interface (Dashboard, Amazon, Users, System) to restore missing backend functionality.
- **Admin Dashboard**: Created `AmazonStats`, `UsersTable`, and `SystemTools` components for modular admin features.
- **Backend**: Implemented DB-based logging (`ScraperLog`) for Fusion/Consolidation to handle timeout scenarios and ensure results are persisted.
- **Backend**: Implemented new `/games` Router to serve unified Game Pages. This endpoint aggregates all regional product variants (NTSC/PAL/JP) into a single API response (`GET /api/v1/games/{slug}`).
- **Backend**: Implemented "Broom Sweep" logic in Consolidation Engine to handle Orphans. It forces the creation of a Game entry for items that failed strict normalization, ensuring 100% database coverage.
- **Backend**: Restored missing `refresh_prices_job` in `enrichment.py` to fix `ImportError` crashing the Scheduler on startup.
- **Backend**: Removed "Collector" keyword veto logic which was causing an **Infinite Loop** (6M+ items processed). Skipped items were never updated in DB, causing them to be re-fetched indefinitely.
- **Backend**: Updated Consolidation logic to prioritize **NTSC/Clean Titles** as the source for Global Game Pages. This prevents "(PAL)" or "(JP)" from appearing in the main page title/slug.
- **Backend**: Fixed critical Memory Leak (Status 134) in Consolidation Job by clearing SQLAlchemy session (`expunge_all`) after each batch.
- **Backend**: Removed expensive `count()` and `order_by` from Consolidation Job to allow instant start-up on large datasets (126k+), processing in random batches.
- **Backend**: Optimized `consolidation.py` to use **Batch Processing** (Fetch/Commit loop) instead of Streaming. This fixes the `psycopg2.ProgrammingError` caused by committing inside an active cursor.
- **Backend**: Limited Dry Run to 5000 items to enable quick validation without processing the entire 126k dataset.
- **Admin Dashboard**: Added 'Details' column to Logs table to show real-time progress messages.
- **Backend**: Promoted `/consolidation/run` to a Background Task to eliminate HTTP Timeouts on large datasets.
- **Backend**: Optimized `consolidation.py` to provide real-time status updates (items processed count) in logs to prevent "stuck" appearance during long jobs.
- **Documentation**: Initialized `CHANGELOG.md` to track project history.

## [Previous Sessions]
*(Reconstructed history based on recent context)*

### 2024-12-30
- **Debugging**: Investigated 404 Routing issues.

### 2024-12-20
- **Amazon**: Implemented Regional Pricing Logic (NTSC/PAL/JP).
- **ListingClassifier**: Enhanced logic to auto-detect region based on domain.

### 2024-12-26 to 2024-12-29
- **Android App**: Configuration and Validation of the Capacitor/Android Studio project.
- **Mobile app**: Migrated to `html5-qrcode` to resolve camera permission issues on Android.
- **Scanner**: Implemented "Scan to Add" and "Scan to Link" features for contributing unknown barcodes.
- **Scanner**: Created `ScannerModal` for a unified scanning experience (Camera/File/Manual Entry).
