<!-- last_verified: 2026-04-24 -->
# genblaze-spec

Language-neutral contract for genblaze manifests and streaming events.

Ships:

- **`schemas/manifest/v1/`** — Draft 2020-12 JSON Schemas for the `Run` / `Step` / `Asset` / `Manifest` / `EmbedPolicy` wire format.
- **`schemas/events/v1/`** — Draft 2020-12 JSON Schemas for the `StreamEvent` discriminated union emitted by `Pipeline.stream()`.
- **`ts/genblaze.d.ts`** — TypeScript type declarations generated from the schemas.
