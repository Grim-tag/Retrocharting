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
- **Documentation**: Initialized `CHANGELOG.md` to track project history.

## [Previous Sessions]
*(Reconstructed history based on recent context)*

### 2024-12-30
- **Debugging**: Investigated 404 Routing issues.

### 2024-12-20
- **Amazon**: Implemented Regional Pricing Logic (NTSC/PAL/JP).
- **ListingClassifier**: Enhanced logic to auto-detect region based on domain.
