# Migrating to genblaze 0.3.2 (TypeScript/JavaScript Edition)

**Wave:** `0.3.2 — storage ergonomics & GMI catalog hygiene` (2026-05-26).

This wave is **additive-only** — no existing import paths, options, or behaviors break.

## TL;DR — most callers do nothing

```bash
npm install @genblaze/core @genblaze/s3 @genblaze/providers
```

Existing code keeps working cleanly.

## Key Highlights

- `URLPolicy` relocated to core.
- `S3StorageBackend.for_backblaze()` durable URLs and key strategies (`HIERARCHICAL`, `FLAT`, `CONTENT_ADDRESSABLE`).
- Full binary provenance embedding for PNG, JPEG, MP4, MP3, WAV.
