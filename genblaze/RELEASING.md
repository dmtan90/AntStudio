# Releasing Genblaze (TypeScript/JavaScript Edition)

How releases are cut and published to npm.

## Versioning policy

Genblaze ships npm packages from this monorepo: `@genblaze/core`, `@genblaze/s3`, `@genblaze/embed`, `@genblaze/providers`, `@genblaze/cli`, `@genblaze/spec`.

## Pre-release checklist

1. **Build checks pass**: `npm run build`
2. **TypeScript checks pass**: `npx tsc --noEmit`
