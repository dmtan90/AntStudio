<!-- last_verified: 2026-05-11 -->
# Genblaze — Claude Code Config

- Follow [AGENTS.md](AGENTS.md) at all times
- Read order: README.md → ARCHITECTURE.md → AGENTS.md → relevant feature doc
- Plans go in `docs/exec-plans/active/`
- Test commands: `npx tsc --noEmit` (full-suite gate)
- Lint: `npm run build`
- Always run `npx tsc --noEmit` before considering work complete
- Update docs in the same PR as code changes
- Keep diffs minimal — only change what's needed
