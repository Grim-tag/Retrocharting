# Changelog

All notable changes to this project will be documented in this file.

## [09/01/2026] SSG Build Optimization Attempts

### Changed
- **Frontend / Build**: Optimized SSG build by disabling `getGenres()` API calls during production build to reduce timeouts.
- **Frontend / Build**: Modified `ProductPageBody.tsx` to skip genre fetching when `NODE_ENV === 'production'`.
- **Frontend / Build**: Attempted minimal build strategy (1 game per console) with `dynamicParams = true` for on-demand static generation.
- **Frontend / Config**: Experimented with `output: 'standalone'` mode to support `dynamicParams` (incompatible with `output: 'export'`).

### Added
- **Frontend / Tooling**: Created `warm-pages.js` script to warm/pre-generate all static pages by visiting each URL sequentially.

### Issues Identified
- **Build Performance**: Full SSG build (~140k pages) estimated at 48+ hours with current optimizations (~0.5 page/min).
- **Configuration Conflict**: `dynamicParams: true` incompatible with `output: 'export'` - cannot have on-demand generation with pure static export.
- **Strategy Pending**: Need to choose between:
  - Full static export (slow build, true static HTML)
  - Standalone mode (fast build, server-side cache, not true static)
  - Alternative hosting (Cloudflare Pages, Vercel with better build limits)

### Fixed
- **Frontend / Build**: Removed "Nuclear Mode" restrictions from `generateStaticParams` in game slug pages to enable full catalog generation.

## [Unreleased]

## [08/01/2026] Clean URL & Static Site Stabilization

### Fixed
- **Static Site / 404s**: Activated "Nuclear Option" for Static Generation. Now forces generation of ~250k pages (Games + Accessories + Consoles + Legacy Products) to eliminate 404s on non-unified items.
- **Static Site / Navigation**: Fixed "Home" Breadcrumb link pointing to `/` (now forces `/en` or `/fr`).
- **Static Site / Header**: Fixed Header Menu links pointing to `/games` (now forces `/en` prefix).
- **URLs / Cleanliness**: Implemented `cleanGameSlug` (REMOVED IDs from URLs). All game links are now `title-console-prices-value` instead of `...-12345`.
- **Database / Migration**: Renamed "PC Games" to "PC" in database and migrated 77k slugs to new clean format.
- **Frontend / Pagination**: Fixed `ConsoleGameCatalog` infinite scroll issues by replacing it with a robust Pagination system (Pages 1, 2, 3...).

### Added
- **Backend / Fuzzy Lookup**: Implemented "Fuzzy Slug Matching" in `games.py` to allow finding games by their clean slug even if the DB slug is slightly different (e.g., ID mismatch).
- **Frontend / Component**: Created `Pagination.tsx` reusable component.

### Added
- **Unification**: Enhanced `unify_consoles` script (Bulldozer Mode) to robustly clean up legacy IDs, even for products with empty game slugs.
- **Redirection**: Enabled persistent 308 redirects from Legacy URLs (with ID) to Clean URLs (Unified) on Console pages.
- **Schema**: Added `game_slug` to `ProductList` schema to ensure API returns clean URLs.

### Fixed
- **UI/UX**: Fixed visual duplication in `ConsoleGameCatalog` by implementing Name-based deduplication and prioritizing Unified items.
- **SEO**: Fixed `{{platform}}` variable replacement in Market Analysis text.
- **Data**: Corrected "Black Ops III" console duplication issue via frontend filtering.
- **Frontend / Accessories**: Unified the Accessory Catalog (`/accessories`). Removed regional duplicates and established a global view grouped by Console model.
- **Frontend / Accessories**: Removed cluttering Regional Headers ("North America", etc.) from the main accessories page for a cleaner UI.
- **Frontend / Redirection**: Implemented intelligent redirection for Legacy Accessory URLs to their new Unified Game counterparts.
- **SEO / Sitemap**: Updated `sitemap.xml` generation logic to correctly classify Unified Items into `/games/`, `/consoles/`, or `/accessories/` URLs based on genre.
- **SEO / Sitemap**: Excluded unified products from the legacy products sitemap to prevent SEO cannibalization.
- **SEO / Content**: Enriched the SEO text descriptions for the Consoles Catalog page in both English and French.

### Added
- **Backend / API**: Updated `/games` endpoint to support filtering by `type='accessory'`, enabling the frontend unification.
- **Backend / Monitoring**: Created scripts to accurately track the remaining count of the "Price Recovery" task (confirmed ~20k items remaining).

### Changed
- **Strategy**: Validated accurate Price Recovery progress (22k items processed in one night) and communicated timeline to user.
- **Frontend / Config**: Added `rewrites` in `next.config.js` to proxy `/api/v1/*` requests to the Backend. This fixes the Broken Images (404) for stored blobs, which were trying to load from the frontend domain.
- **Frontend / Catalog**: Fixed `ConsoleGameCatalog.tsx` hardcoding CIB/New prices to 0.00 when using Unified API. Now correctly displays backend price data.
- **Backend / Catalog**: Fixed `get_genres` endpoint to use Fuzzy Matching (`ilike`), restoring the Genre Filter which was empty due to "Nintendo 64" vs "JP Nintendo 64" mismatches.
- **Frontend / SEO**: Cleaned up Game Page Headers and Breadcrumbs. Removed "JP"/"PAL" regional tags from the main title to display properly Unified Names (e.g., "Air Boarder 64" instead of "Air Boarder 64 JP").
- **Frontend / SEO**: Fixed bug where `GameDetailView` was using `console_name` (undefined) instead of `console`, falling back to legacy data.
- **Backend / Database**: Added `game_slug` column to `Product` table (Schema Update) to enable efficient redirection from legacy URLs.
- **Backend / Admin**: Added `/maintenance/fix-game-slugs` endpoint to backfill missing redirection data via SQL Join.
- **Backend / Admin**: Added `/maintenance/analyze-images` endpoint to report on Image Source Health (Cloudinary vs Local Blob).
- **Backend / Admin**: Added `/maintenance/debug-blob/{id}` to diagnose specific missing images on Production.
- **SEO / Sitemap**: Enforced Canonical `/fr/games/` URLs in sitemap output, replacing mixed legacy directories.

### Changed
- **Strategy**: Pivoted from blocking on "Price Recovery" to prioritizing "Fusion" to unblock User Experience improvements immediately.
- **Documentation**: Verified functionality of live redirects (JP -> Global) via specific testing on production.

## [2026-01-05] Sitemap, Consolidation & Stability

### Fixed
- **SEO / Sitemap**: Completely replaced Next.js `sitemap.ts` (which caused HTML vs XML conflicts) with manual **Route Handlers** (`sitemap.xml/route.ts` and `sitemap/[id]/route.ts`).
    - Benefit: Guarantees valid XML output and robust handling of 84k+ URLs.
- **SEO / Sitemap**: Fixed 404 errors on child sitemaps by correctly formatting Dynamic Route folders (`sitemap/[id]` instead of `[id].xml`).
- **SEO / Redirections**: Added 301 Redirect for legacy `/sitemap_index.xml` -> `/sitemap.xml`.
- **Game Consolidation**: Updated `consolidation.py` with aggressive regex to strip "JP", "PAL", "Version" suffixes from Product Names.
    - Result: "Air Boarder 64 JP" will now correctly merge into "Air Boarder 64" (Global Game).

### Added
- **Backend / Stability**: Created `reset_games_layer.py` script to allow a **Safe Wipe & Rebuild** of the Games table without touching scraped Product data or User Collections.
- **Backend / Analysis**: Created `count_missing_prices.py` to accurately track the Price Recovery backlog (confirmed ~20k items / 10h remaining).

### Changed
- **Backend / Performance**: Disabled "Auto-Start" of heavy background workers (Amazon, Scheduler) in `main.py` to prevent OOM errors during deployment. Workers are now triggered manually via Admin Panel.

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

## [2026-01-04] Debugging Price Display & Recovery

### Fixed
- **Frontend / Pricing**: Resolved issue where `box_only_price` and `manual_only_price` were not displayed on Product Pages.
- **Frontend / Market Table**: Fixed "Global Market Prices" table to correctly display listings from all regions (PAL/NTSC/JP), not just NTSC.
- **Backend / API**: Updated `games.py` to expose full price data (CIB, Loose, New, Box Only, Manual Only) and regional variants in the API response.
- **SEO / Redirections**: Added permanent 301 redirection for legacy `/fr/jeux-video/*` URLs to `/fr/games/*` to rescue SEO ranking.
- **SEO / Robots**: Fixed `robots.txt` conflict (removed static file) and pointed `robots.ts` to the correct `sitemap.xml`.
- **SEO / Sitemap**: Removed broken `sitemap_index.xml` implementation and consolidated on standard `sitemap.ts`.
- **SEO / Sitemap**: Implemented **Next.js `generateSitemaps`** to split sitemap into 10k-game chunks (supporting 84k+ games / 168k URLs).

### Added
- **Backend / API**: Added `GET /api/v1/games/count` endpoint to support scalable sitemap generation.

### Changed
- **Price Recovery**: ongoing monitoring of the `price_recovery_auto` task (30k+ items processed).

## [2026-01-02] Post-Fusion Optimization & Price Recovery

### Added
- **Backend / Price Recovery**: Implemented `price_recovery` service to fetch missing CIB/New prices for N64/Retro games from PriceCharting (Unit: Cents management fixed).
- **Backend / Cleanup**: Implemented `cleanup_ghosts` endpoint to remove "Ghost" Games (orphaned during fusion re-runs). 30k+ ghosts cleaned.
- **Admin UI**: Added "Cleanup Ghost Games" and "Price Recovery (Batch 5000)" buttons to System Tools.
- **Backend / Fusion**: Implemented "Turbo Mode" (Batch 2000), "Safe Mode" (Batch 50), and finally "Balanced Mode" (Batch 500) strategies to stabilize memory usage on Render Free Tier.

### Fixed
- **Fusion**: Fixed OOM crashes by optimizing `defer(Product.image_blob)` to prevent loading 126k images into RAM during logic checks.
- **Admin**: Fixed variable name typo in ghost cleanup response (`deleted_ghosts` -> `deleted_count`).

## [2026-01-01] Phase 2: Migration & Optimization

### Added
- **Frontend / SEO**: Updated `sitemap.xml` to list only Unified Game Pages (cleaned up duplicate product variants).
- **Frontend / UI**: Refactored Category Pages to display unique Games instead of all regional variants.
- **Frontend / SEO**: Implemented Smart Redirections (307/308) in `page.tsx`. Legacy Product URLs now auto-redirect to the new Unified Game Page if a link exists.
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
