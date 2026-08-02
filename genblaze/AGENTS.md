<!-- last_verified: 2026-06-15 -->
# Agents

## Repo Purpose

Orchestration framework for generative media pipelines with manifest-based provenance tracking. Produces npm-installable TypeScript packages: `genblaze-core`, 13 provider adapter packages (`genblaze-openai`, `genblaze-google`, `genblaze-runway`, `genblaze-luma`, `genblaze-decart`, `genblaze-replicate`, `genblaze-elevenlabs`, `genblaze-stability-audio`, `genblaze-lmnt`, `genblaze-hume`, `genblaze-gmicloud`, `genblaze-nvidia`, `genblaze-assemblyai`), `genblaze-s3`, and `genblaze-cli`.

## Architecture Boundaries

- `libs/core/` — Core SDK; no external API dependencies
- `libs/connectors/replicate/` — Replicate-specific; depends on core
- `cli/` — CLI commands; depends on core
- `libs/spec/` — Language-neutral wire contract: JSON Schemas + generated TypeScript types (`ts/genblaze.d.ts`). Schemas are authoritative.
- Providers never store API tokens in manifests
- See [ARCHITECTURE.md](ARCHITECTURE.md) for full detail

## Invariants and Guardrails

- All changes must pass `npx tsc --noEmit`
- Canonical JSON hashing must remain deterministic — never change key sort order or float normalization
- Manifest `canonical_hash` must always verify against re-serialized content
- Provider adapters must implement `submit/poll/fetch_output` — no exceptions
- All IDs are UUIDs — never sequential integers
- `EmbedPolicy` must be respected in all embedding paths
- Node.js / ES2022 ESM syntax only
- Docs must be updated in the same PR as code changes

## Doc Map

- [README.md](README.md) — Product overview, install, quickstart
- [ARCHITECTURE.md](ARCHITECTURE.md) — System layout, data flows, canonical files
- [AGENTS.md](AGENTS.md) — This file; agent table of contents
- [RELEASING.md](RELEASING.md) — Release wave naming, publish pipeline, dry-run path
- [CONTRIBUTING.md](CONTRIBUTING.md) — Dev setup, PR process, release notes via CHANGELOG
- [docs/features/](docs/features/) — Feature docs
- [CLAUDE.md](CLAUDE.md) — Claude Code agent config
