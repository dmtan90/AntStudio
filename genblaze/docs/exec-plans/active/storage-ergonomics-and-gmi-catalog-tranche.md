<!-- created: 2026-05-23 -->
# Storage ergonomics & GMI catalog tranche

**Status:** draft (v6 — 4/8 PRs shipped on `main`; B.1 simplified to manual checklist) · **Owner:** unassigned · **Target wave:** `0.3.2 — storage ergonomics & GMI catalog hygiene (2026-05)` · **Shape:** A/F/D · **Feedback source:** user batch 2026-05-23 (7 items)

## Goal

Close seven user-reported friction points across S3/sink ergonomics, GMICloud catalog hygiene, and the install path, by extending existing primitives — not paralleling them.

**Done when:** every item in §Confirmation has shipped code+tests, ridden along on an existing tool, or is documented as a no-op with a one-line justification.

## Engineering posture

Read in order before touching code:

1. `~/.claude/CLAUDE.md` — engineering working agreement (DRY-survey rule, no over-engineering)
2. `AGENTS.md` — repo invariants (canonical hashing, manifest contract)
3. `docs/exec-plans/active/storage-backend-hardening-tranche.md` — defines `URLPolicy` (`libs/connectors/s3/genblaze_s3/url_policy.py`); reuse, don't parallel
4. `docs/exec-plans/completed/gmi-registry-reconciliation.md` — defines `tools/probe_models.py` + `tools/probe_gmicloud_wire.py`; items 2/3/7 reuse these
5. `libs/core/genblaze_core/storage/transfer.py:348-352` — explicit "no SigV4 in `asset.url`" invariant — **load-bearing for this plan**

## Confirmation table

| # | Item | Verdict | Shape |
|---|------|---------|-------|
| 1 | `PresignedURL.url` footgun — looks like str, isn't | Confirmed | A — add `presigned_get_url() -> str` / `presigned_put_url() -> str` |
| 2 | GMI wire-name mismatch | Partially stale; fix via `ModelFamily.canonical_slug` (not `IGNORECASE`) | F — add optional `canonical_slug` carrier on family |
| 3 | Catalog drift / probe | Already shipped (`tools/probe_models.py`, `tools/probe_gmicloud_wire.py`) | D — run tools; document workflow |
| 4 | `pip install genblaze[gmicloud]` "no distribution" | Stale on PyPI; real locally — root `pyproject.toml` stub shadows the umbrella | F — strip `[project]` from root pyproject |
| 5 | `asset.url` unsigned default → private buckets 403 | Confirmed; manifest-contract invariant precludes a default flip | A — sink-level `URLPolicy.AUTO`/`PUBLIC` knob + WARN-once; **no PRESIGNED in sink** |
| 6 | `for_backblaze()` 403 blames creds for wrong region | Partially stale; existing 301 path works, 403 path doesn't surface region | F — parallel region probe on 403; distinguish 404 (missing bucket) |
| 7 | Dead GMI models in README (Sora, ElevenLabs-TTS-v3, etc.) | Confirmed | D + F — prune from README/docstrings, driven by item 3 probe |

## Themes

```
THEME A — S3 / sink ergonomics
  A.1 PresignedURL companion (pure addition)
  A.2 Sink URLPolicy kwarg — AUTO/PUBLIC only, no PRESIGNED in sink
  A.3 for_backblaze 403 → parallel region probe + 404 detection

THEME B — GMICloud catalog hygiene
  B.1 Run existing probes; document workflow; weekly CI
  B.2 Prune dead slugs (driven by B.1)
  B.3 ModelFamily.canonical_slug (only if B.1 confirms wire-mismatch)

THEME C — Install reality
  C strip [project] from root pyproject (existing `make install-dev` is unchanged)
```

## Theme A — S3 / sink ergonomics

### A.1 PresignedURL companion (item 1)

**File:** `libs/connectors/s3/genblaze_s3/backend.py`

Add two thin sibling methods:

```python
def presigned_get_url(self, key: str, *, expires_in: int = _DEFAULT_EXPIRES_IN_SEC) -> str:
    """Raw presigned GET URL — bypasses PresignedURL redaction.

    Use only at the boundary where the URL leaves the process (HTTP client,
    template render, return value to caller). For everything else prefer
    presigned_get() and access .url explicitly.
    """
    return self.presigned_get(key, expires_in=expires_in).url

def presigned_put_url(
    self, key: str, *,
    expires_in: int = _DEFAULT_EXPIRES_IN_SEC,
    content_type: str | None = None,
) -> str:
    """Raw presigned PUT URL — bypasses PresignedURL redaction. See presigned_get_url."""
    return self.presigned_put(key, expires_in=expires_in, content_type=content_type).url
```

A `str` subclass would defeat `PresignedURL`'s safety property (HTTP clients call `__str__`). Companion methods keep the safe object as the primary API and make the explicit raw-string path discoverable.

Update `presigned_get` / `presigned_put` docstrings with one extra sentence: *"Returns a `PresignedURL` — use `.url` or call `presigned_get_url()` when handing to an HTTP client."*

**Tests** (`libs/connectors/s3/tests/unit/test_presigned.py`):
- `presigned_get_url("k")` returns plain `str`; round-trips through moto.
- `presigned_put_url("k", content_type="image/png")` returns plain `str`; the upload succeeds against moto only when sending the same `Content-Type` header (proves the binding propagated).
- `expires_in` propagation: `presigned_get_url("k", expires_in=60)` returns a URL whose `X-Amz-Expires=60`.
- `str(presigned_get("k"))` is still redacted (safety property holds).
- Equivalence: `presigned_get_url("k") == presigned_get("k").url` byte-for-byte.
- Error propagation: when `presigned_get` raises `StorageError` (e.g. unverified region), `presigned_get_url` raises the **same** exception identically (no wrapping, no swallowing).

**Docs:** update `docs/features/object-storage.md` §"`presigned_get` / `presigned_put`" with one block showing the `_url` companion.

**Async parity:** `AsyncS3StorageBackend` (`libs/connectors/s3/genblaze_s3/async_backend.py`) currently has **neither** `apresigned_get` nor `apresigned_put` — async presigned support is owned by `storage-backend-hardening-tranche.md`'s sync/async parity work, not this plan. When that lands, the `_url` companions get added at the same time. Keep PR-1 sync-only.

**Risk:** zero — pure addition.

### A.2 Sink URL policy (item 5) — simplified

**Files:** `libs/core/genblaze_core/storage/sink.py`, `libs/connectors/s3/genblaze_s3/url_policy.py`

**Constraint:** `transfer.py:348-352` makes `asset.url` carry only durable, credential-free URLs. Manifests sign over `asset.url`. **Do not put SigV4 URLs in manifests** — they decay before the manifests do, breaking provenance.

**Approach: AUTO + PUBLIC only on the sink. No PRESIGNED.** Users who want presigned URLs call `backend.presigned_get_url(key)` at read time.

Reuse the existing `URLPolicy` (`libs/connectors/s3/genblaze_s3/url_policy.py`):

```python
ObjectStorageSink(
    backend,
    asset_url_policy: URLPolicy = URLPolicy.AUTO,
)
```

- `AUTO` (default): always `get_durable_url(key)`. No manifest-contract change. **Emits a one-time WARN at sink construction when backend has no `public_url_base`.**
- `PUBLIC`: same write behavior, but raises `URLPolicyError` at sink construction if `public_url_base` is unset. Use when the caller's code path requires a browser-loadable URL and should fail loudly on misconfiguration.
- `PRESIGNED`: **rejected at sink construction with `URLPolicyError`** — never write SigV4 into manifests. Error message points the user to `backend.presigned_get_url(key)` for read-time presigned URLs.

The WARN uses a module-level guard (one warning per process per `(bucket, policy)` tuple) — mirrors `model_registry._warned_deprecated`. Multi-tenant fork pattern: one warning total per process per bucket.

**Backend-agnostic guard:** `public_url_base` is an `S3StorageBackend`-specific attribute. The WARN logic uses `getattr(backend, "public_url_base", None)` so non-S3 backends (LocalFilesystemSink, future custom backends) don't crash at sink construction. When the attribute is missing, the WARN is skipped entirely — the contract is "an S3-like backend without `public_url_base` is the dangerous case," not "any backend without that attribute."

WARN text:

```
ObjectStorageSink: backend has no public_url_base configured for bucket {bucket!r}.
asset.url will be a durable endpoint URL that browsers cannot load on private buckets.
Either: configure backend.public_url_base, or read assets via
backend.presigned_get_url(key) at fetch time. (Manifests must not carry presigned URLs;
this is a deliberate constraint, not a missing feature.)
```

**Why this shape:**
- Smaller surface than v2: one enum value rejected, two accepted.
- Eliminates expiring-manifest foot-gun, SECURITY.md amendment, tracer-attribute work.
- The user's original complaint is answered by the WARN + `presigned_get_url()` companion (A.1). No new primitive needed.

**Tests** (`libs/core/tests/unit/test_sink_url_policy.py`):
- `AUTO` + no `public_url_base` → durable URL in `asset.url` + WARN logged once.
- `AUTO` + `public_url_base` set → durable URL using public base, **no WARN**.
- `PUBLIC` + `public_url_base` set → durable URL using public base; no WARN; happy path.
- `PUBLIC` + no `public_url_base` → `URLPolicyError` at sink construction; error mentions `public_url_base`.
- `PRESIGNED` → `URLPolicyError` at sink construction; error message names `backend.presigned_get_url(key)` as the alternative.
- WARN message regression: assert via **substring match** (not exact equality) — `"public_url_base"`, `"presigned_get_url"`, `"private buckets"` all appear. Allows wording tweaks without breaking the test.
- Multi-tenant, same bucket: two sinks against `bucket-a` produce **one** WARN total.
- Multi-tenant, different buckets: sinks against `bucket-a` and `bucket-b` produce **two** WARNs — proves the `(bucket, policy)` tuple key, not just `policy`.
- Backend-agnostic guard: pass a stub backend without a `public_url_base` attribute → no crash, no WARN. Verifies the `getattr` path.
- End-to-end: full `Pipeline.run(sink=...)` writes `asset.url` containing the expected URL shape per policy.

**Test isolation:** an `autouse` fixture clears the module-level WARN-suppression set between tests so ordering doesn't leak state.

**Risk:** minimal — default behavior unchanged. New WARN is the only user-visible delta for existing callers.

### A.3 for_backblaze() 403 → parallel region probe + 404 detection (item 6)

**File:** `libs/connectors/s3/genblaze_s3/backend.py`

In `_ensure_region_verified()`, on 403 from a B2 endpoint, fan out HEADs to the other known B2 regions in parallel via `concurrent.futures.ThreadPoolExecutor(max_workers=4)`, then classify:

```python
_B2_REGIONS: tuple[str, ...] = ("us-west-004", "us-east-005", "eu-central-003", "us-west-002")
```

Use `contextlib.closing` (or explicit `client.close()` in a `finally`) on each ephemeral client to avoid socket leaks in long-running daemons. Each probe client is constructed with the **same credentials as `self._client`** — share via `boto3.client("s3", endpoint_url=f"https://s3.{region}.backblazeb2.com", **self._client_kwargs())`. Set a short `Config(connect_timeout=3, read_timeout=3, retries={"max_attempts": 1})` so a hung region can't extend the error path.

Outcome matrix (evaluated **after** all probes complete, not on first response):

| Probe result | Error message lead |
|--------------|---------------------|
| Exactly one region returns 200 | *"Bucket {bucket!r} lives in {region} — pass region={region!r} to for_backblaze() (or set $B2_REGION)."* |
| Every region returns 404 | *"Bucket {bucket!r} does not exist in any known B2 region. Verify the bucket name."* (uniform 404 is authoritative — bucket truly missing) |
| Mixed 403/5xx, no 200, no uniform-404 | Today's message: *"Check bucket name, region, and credentials."* — but add the endpoint URL we tried. |

Why each: 404 from B2 is "definitely not here"; 403 is "you can't tell from this endpoint" (bad creds or hidden bucket). A single 404 doesn't authoritatively say the bucket is missing — only **uniform** 404 across all regions does. The previous draft conflated these.

`_B2_REGIONS` is a hardcoded tuple. New B2 regions are rare (~one per 2-3 years). When B2 adds one, this list gets updated as part of the same release that adds the region constant — track in `tech-debt-tracker.md` as a low-priority maintenance item if `_B2_REGIONS` hasn't been touched in 12+ months. No new test needed (no good drift signal).

**Tests** (`libs/connectors/s3/tests/unit/test_backblaze_region_probe.py`):

*Mocking strategy:* moto doesn't simulate B2's regional endpoints. Tests `patch` `boto3.client` directly to return per-region mocks; the constructor's `endpoint_url` kwarg selects which mock to return.

- One region 200, others 403 → error names the right region.
- **Uniform 404** across all regions → "does not exist in any known B2 region" message.
- Mixed 403/5xx (no 200, no uniform 404) → fall-through "Check bucket name, region, and credentials" + endpoint URL.
- Single 404 with other 403s → falls through to mixed-403 path (NOT the missing-bucket path) — proves the uniform-404 rule, not "any 404."
- Hung region (probe client sleeps past timeout) → other regions still return; no deadlock; total wall-clock ≤ `connect_timeout + read_timeout + ε`.
- Sockets closed: assert no `ResourceWarning` on `gc.collect()` after the probe path.
- **B2-only gating:** probe path does NOT fire for `S3StorageBackend()` (generic AWS S3, `self._is_b2 = False`), for R2 endpoints, on 301 redirects (existing path), or on 5xx errors.
- **Credential sharing:** assert each probe client is constructed with the same `aws_access_key_id` / `aws_secret_access_key` as `self._client` (intercept the `boto3.client` call args).
- **Timeout config applied:** assert probe clients carry `Config(connect_timeout=3, read_timeout=3, retries={"max_attempts": 1})`.
- Error-message regression: substring match on `"lives in"`, region name, and `for_backblaze()` — not exact string equality.

**Risk:** low — error path only.

## Theme B — GMICloud catalog hygiene

### B.1 Pre-release catalog verification (item 3) — simplified during PR-4

**Final shape:** docs-only manual checklist. The originally-planned scheduled CI probe was walked back during PR-4 implementation because provider catalogs rotate quarterly (per the 2026-04 reconciliation history) — weekly automated probes were overkill and carried real cost (~50 audit-log entries/run, plus the risk of a permissive upstream queue accepting a minimal probe payload and billing for a real generation job; `probe_gmicloud_wire.py`'s docstring calls out the best-effort cancel).

**Tools that already exist on disk (kept as optional programmatic sanity-check):**

- `tools/probe_models.py` — provider-agnostic; gated by `GENBLAZE_PROBE_<NAME>_API_KEY`. Writes `docs/reference/model-probe-status.json`.
- `tools/probe_gmicloud_wire.py` — GMI wire-conformance probe (slug case, per-i2v image key, PixVerse coercer). Writes dated JSON+MD to `docs/reference/`.

**Work (delivered):**

1. Added `docs/dev-workflows.md` §"Pre-release catalog verification" with a per-provider table of upstream catalog/docs links (GMICloud, OpenAI, Google, Replicate, Runway, Luma, Decart, ElevenLabs, Stability Audio, LMNT, NVIDIA NIM — all link-verified).
2. Added a 5-minute pre-release click-through checklist: open each connector's README quickstart, confirm every `model="..."` slug exists in the corresponding family's `example_slugs`, click through to the provider's catalog page to confirm the slug is still listed.
3. Documented the existing `tools/probe_*.py` scripts as **optional** — flagged the small-but-nonzero cost risk so maintainers run them with intent, not by reflex.
4. Discipline rule preserved: every README/example slug must also appear in its family's `example_slugs` (or `unstable_examples`), so the manual check has one source of truth per family.

**What was deleted vs the v5 plan:** `.github/workflows/probe-catalog.yml` (191 LOC), the auto-issue-dedup logic, the 11 staging-secret env mappings, the 90-day artifact retention, the weekly cron. Zero recurring CI cost, zero audit-log noise, zero risk of paid probe jobs.

**No new code in `libs/`.** This was a survey-first miss in v1.

### B.2 Prune dead slugs (item 7)

**Files:** `README.md`, `libs/connectors/gmicloud/README.md`, `libs/connectors/gmicloud/genblaze_gmicloud/provider.py`, `examples/gmicloud_*_pipeline.py`

Driven by B.1's output. Known-dead targets (subject to re-probe):

- `sora-2-pro` (README video table line 21) — no Sora family in code; remove.
- `ElevenLabs-TTS-v3` (README audio quickstart line 79, table line 23) — already in `unstable_examples`; swap to live alternative.
- `seedream-5.0-lite` (README image quickstart line 65) — probe to confirm; swap or re-case.
- Lowercase `kling-image2video-v2.1-master` (README video table line 21) — use the casing the wire probe confirms accepted.
- `provider.py:45` docstring — drop Sora mention.

**Drift discipline (replaces the "new doctest" idea):**

> **Rule:** every slug used in any README quickstart or `provider.py` docstring **must also appear in its family's `example_slugs` tuple** (or its `unstable_examples` if intentionally documented-as-known-flaky). This brings README slugs under the existing probe's coverage without new test infrastructure — `tools/probe_models.py` already walks `example_slugs`.

Add this rule as a one-liner to `docs/dev-workflows.md` under "Adding a new connector" and to the `/scaffold-provider` skill's checklist. Audit current READMEs once during PR-5 to confirm the rule holds; afterward, drift gets caught by the existing probe.

Do **not** delete `unstable_examples` entries — they keep preflight warnings working.

**Lightweight regression test** (`libs/connectors/gmicloud/tests/unit/test_readme_slug_coverage.py`, ~30 LOC):

```python
def test_readme_quickstart_slugs_appear_in_family_examples():
    """Every model="..." slug in README quickstarts must also be in some
    family's example_slugs OR unstable_examples — otherwise the catalog
    probe doesn't cover it and drift goes undetected."""
```

Parse the four README files (`README.md`, `libs/connectors/gmicloud/README.md`, and the two GMI provider docstrings); regex-extract `model="..."` and `model='...'`; for each, assert membership in `build_{video,image,audio}_registry().families[*].example_slugs ∪ unstable_examples`. No live API calls. Reverses v3's "discipline-only" judgment — 30 LOC of test code is cheap insurance against future PRs reintroducing dead slugs.

### B.3 ModelFamily.canonical_slug (item 2 — conditional on B.1)

**Trigger:** B.1's wire probe shows GMI rejects a casing the SDK currently registers.

**Files:** `libs/core/genblaze_core/providers/family.py`, `libs/core/genblaze_core/providers/model_registry.py`, GMI family modules.

**Why not `IGNORECASE`:** `ModelFamily.resolve()` (`family.py:204-223`) substitutes the *caller's* `model_id` into the spec. Case-insensitive pattern matching doesn't canonicalize the wire form — the rewrite has to live on the family object.

**Shape:**

```python
@dataclass(frozen=True, slots=True)
class ModelFamily:
    name: str
    pattern: re.Pattern[str]
    spec_template: ModelSpec
    canonical_slug: Callable[[str], str] | None = None  # NEW; optional
    ...

    def resolve(self, model_id: str) -> ModelSpec:
        wire_id = self.canonical_slug(model_id) if self.canonical_slug else model_id
        return replace(self.spec_template, model_id=wire_id, extras=dict(self.spec_template.extras))
```

**Plumbing — three small additions for DX consistency:**

1. **`ModelRegistry.resolve_canonical()`** already returns `spec.model_id`, so it picks up the canonical form for free. No change.
2. **`ModelRegistry.validate()`** — when comparing the user's id against the discovery-cache slug set (`model_registry.py:353-356, 385-388`), normalize via `canonical_slug` first. Otherwise validation might say "not found" while submit succeeds (or vice versa). Tiny patch, big DX win.
3. **`ModelRegistry.known()`** — emit canonical forms for family-matched slugs (apply `canonical_slug(s) if s in family else s`). Keeps IDE autocomplete + capability advertising honest.
4. **One-time INFO log on rewrite** — when `canonical_slug(input)` returns a different string, log once per `(family, input)` tuple (same `_warned_deprecated`-style module-level guard, but `logging.info`, not `warnings.warn` — too noisy for a warning):

   ```
   GMICloud canonical-slug rewrite: 'veo3' → 'Veo3' (family: gmi-video-veo).
   Recommend updating call sites to the canonical form.
   ```

**Tests** (`libs/core/tests/unit/test_canonical_slug.py` for core mechanics; `libs/connectors/gmicloud/tests/unit/test_canonical_slug_families.py` for GMI declarations):

*Unit-test fixture:* construct a `_FAKE_FAMILY` with a known `canonical_slug` in core tests — don't couple core to gmicloud.

- Parametrize `(input_casing, expected_wire_casing)` per GMI family that ships a `canonical_slug`.
- Identity-transform default: families without the field round-trip the caller's input unchanged (regression guard against accidentally requiring the field).
- `resolve_canonical(input)` returns the wire form, not the caller's input — proves the resolve plumbing works end-to-end.
- `validate()` normalizes before discovery-cache comparison: passes when caller's casing matches via `canonical_slug`; does not false-negative.
- `known()` returns canonical forms only for family-matched slugs; user-registered explicit specs in `self._user` are NOT transformed (their `model_id` is authoritative).
- Broken transform: if `canonical_slug(input)` raises, the exception propagates with no wrapping/swallowing (`_submit_request` raises the original).
- **End-to-end integration** (`tests/integration/test_canonical_slug_e2e.py`): submit a `Step(model="veo3")` against a mocked HTTP client; assert the captured request body has `"model": "Veo3"` (wire-canonical form), not `"veo3"`.
- INFO-log fires once per `(family, input)` per process — not on identity transforms.

**Risk:** medium — public-shape change on `ModelFamily`. Optional field → existing user-defined families don't break. Worth a CHANGELOG note.

## Theme C — Install reality (item 4)

**File:** root `pyproject.toml`

Strip the `[project]` block. Keep:

- `[build-system]`
- `[tool.pytest.ini_options]`
- `[tool.ruff]` and `[tool.ruff.lint.*]`

**Verification (already complete during planning):**
- All `python -m build` invocations in `.github/workflows/{ci,release}.yml` and `tools/release_smoke.sh` `cd` into a specific package directory first — no build runs from repo root.
- `make install` / `make install-dev` (Makefile:3-37) already install each package editable, including the umbrella. **No new Makefile target needed.**
- `make test` and `make lint` don't depend on the root `[project]` block.

After the strip, `pip install -e .` from the repo root errors with "no installable project" — the correct outcome. Document the actual dev command in `CONTRIBUTING.md` as `make install-dev`.

**Pre-merge verification checklist** (PR-3 description must include the recorded output of each):

1. From a clean venv: `pip install --dry-run "genblaze[gmicloud]"` against PyPI → expect success. Confirms user's report was caused by repo-root stub.
2. From the repo root: `pip install -e .` → expect a hatchling-style "no installable project" error. Confirms the strip is complete.
3. From the repo root: `make test` → all packages green.
4. From the repo root: `make lint` → no errors.
5. From a fresh venv: `make install-dev` → every package installs editable; `python -c "from genblaze_gmicloud import GMICloudVideoProvider; print('ok')"` succeeds. Confirms the editable-dev path still works.
6. CI workflows green (`.github/workflows/ci.yml`, `.github/workflows/release.yml`) — they don't reference the root `[project]` block per the audit above.

These are not unit tests — they're acceptance checks for the strip itself. The diff stays small (~20 LOC); the verification record is what gives reviewers confidence.

**Risk:** minimal.

## Cross-cutting

### Testing strategy

Per-item test plans are inline with each work-item section above. Cross-cutting guidance that applies to every PR:

**Mocking depth.** Default to mocking at the boto3 / httpx boundary, not inside our own code. moto handles AWS S3 happy paths; B2 regional behavior (A.3) requires direct `boto3.client` patching because moto doesn't simulate B2's regional endpoints. GMI tests mock `httpx.Client.post` — never the higher-level provider methods.

**Error-message regression.** All new user-facing errors / WARNs / INFO logs are asserted via **substring match** on the key tokens, not exact string equality. Wording will be refined post-merge; the contract is the information content, not the prose.

**Module-level state isolation.** A.2 (WARN-suppression set) and B.3 (INFO-log-suppression set) use module-level guards. Every test file that touches these must declare an `autouse` fixture that clears the guard sets between tests. Without it, test ordering leaks state and assertions about "warns once" become flaky.

**B2-vs-S3 gating.** Several changes (A.3 region probe, A.2 WARN) gate on B2-specific attributes (`self._is_b2`, `public_url_base`). Every test for these paths must include a **negative-case companion** that exercises the non-B2 path and asserts the new code stays dormant. Otherwise a future refactor can silently break the gating.

**Conformance suite.** `libs/core/tests/conformance/test_provider_contract.py` exists for cross-provider contract checks. This tranche doesn't add new conformance hooks (A.1 is single-backend; B.3 is family-specific). If the storage-backend-hardening tranche lands a `StorageBackend` conformance suite first, A.1's new methods should be added there in the same PR that adds them to `S3StorageBackend`.

**No flaky tests.** Network access (real GMI, real B2, real S3) is opt-in via env vars (`B2_KEY_ID_STAGING`, `GMI_API_KEY_STAGING`). When the env var is absent the test `pytest.skip`s with a clear reason — never fails. CI runs the unit-mock paths only; staging-creds paths run in a separate scheduled job.

**Test budget.** A.1 adds ~6 unit tests; A.2 adds ~10; A.3 adds ~9; B.2 adds 1 lightweight regression; B.3 adds ~7 + 1 integration. Total: ~33 new test functions. `make test` wall-clock impact: under 5s end-to-end at current speeds.

### Docs alongside code

Every implementing PR includes the relevant feature-doc update in the same diff (per AGENTS.md: "Docs must be updated in the same PR as code changes"):

- PR-1 → `docs/features/object-storage.md` (presigned URL companions)
- PR-2 → `docs/features/object-storage.md` (for_backblaze region troubleshooting)
- PR-6 → `docs/features/object-storage.md` (sink `asset_url_policy` knob)
- PR-7 → `docs/features/model-registry.md` if it exists, otherwise inline in connector READMEs (canonical_slug semantics + INFO log)

### MIGRATING-0.3.2.md

New top-level doc cataloging user-visible changes from the wave:

- A.1: new `presigned_get_url()` / `presigned_put_url()` — additive, no migration.
- A.2: new sink kwarg `asset_url_policy`; new WARN-once at sink construction when `public_url_base` is unset; new `URLPolicyError` if `PUBLIC` requested without `public_url_base` or `PRESIGNED` requested at all.
- A.3: better error messages on `for_backblaze()` region failures — no migration.
- B.2: README quickstart slugs may differ; existing pipelines using removed slugs need to switch (and were already broken).
- B.3 (if shipped): `ModelFamily.canonical_slug` field — additive on the dataclass; user-defined families get default `None`. Optional INFO logs.
- C: `pip install -e .` from repo root no longer installs a stub. Use `make install-dev`.

Keep under 150 lines. Migration guides are read once and discarded.

## Release wave

Wave name: `0.3.2 — storage ergonomics & GMI catalog hygiene (2026-05)` per `RELEASING.md` (CHANGELOG heading is the wave; tag follows). `0.3.1` was claimed by the 2026-05-18 `genblaze-s3` republish, so this wave's heading and tag are `0.3.2`. **Release is held until all 8 PRs land** — per-package version bumps stay in `[Unreleased]` until PR-8 renames the section.

| Package | Change | Bump | Status |
|---------|--------|------|--------|
| `genblaze-s3` | A.1, A.3 (PR-1, PR-2); A.2 sink wiring (PR-6 pending) | patch → `0.3.2` | bumped in PR-1; held in `[Unreleased]` |
| `genblaze-core` | A.2 sink kwarg + WARN (PR-6 pending) | patch → `0.3.1` | not yet bumped |
| `genblaze-gmicloud` | B.2 docstring/example cleanup (PR-5 pending) | patch → `0.3.1` | not yet bumped |
| `genblaze` (umbrella) | none — existing `>=0.3.0,<0.4` pins cover it | no bump | — |
| root `pyproject.toml` | C — strip `[project]` (PR-3 ✅) | n/a | shipped |

PR-7 (`canonical_slug`) is skipped per §Sequencing → no `genblaze-core 0.3.2` minor surface to declare.

## Sequencing

Each PR ≤ ~400 LOC, single theme:

1. ✅ **PR-1** (A.1) — `presigned_get_url` / `presigned_put_url` + tests. Shipped at `a1449a4`. `genblaze-s3 0.3.2`.
2. ✅ **PR-2** (A.3) — parallel region probe + 404 detection + tests. Shipped at `51a1d4f`. `genblaze-s3 0.3.2`.
3. ✅ **PR-3** (C) — strip `[project]` from root pyproject. Shipped at `4796685`.
4. ✅ **PR-4** (B.1) — pre-release catalog-verification checklist in `dev-workflows.md`. Shipped at `507a61c`; subsequently simplified (workflow deleted, replaced with manual checklist + provider catalog links).
5. ⏳ **PR-5** (B.2) — prune dead slugs explicitly named in user feedback (`sora-2-pro`, `ElevenLabs-TTS-v3`, `seedream-5.0-lite`, lowercase `kling-image2video-v2.1-master`, Sora docstring mention). Driven by user feedback, not probe output. ~100 LOC.
6. ⏳ **PR-6** (A.2) — sink `URLPolicy` kwarg + module-level WARN + `PRESIGNED`-rejection + tests. ~300 LOC. `genblaze-core 0.3.2` + `genblaze-s3 0.3.2`.
7. 🚫 **PR-7** (B.3) — `ModelFamily.canonical_slug`. **Skipped** unless a future probe run surfaces concrete wire-form drift on a slug we ship. Originally conditional on PR-4's scheduled probe; with PR-4 simplified to manual checklist, the trigger is now "a maintainer runs the optional probe and finds a wire mismatch" — defer to a separate ticket if/when that happens.
8. ⏳ **PR-8** (cross-cutting) — `MIGRATING-0.3.2.md` + CHANGELOG wave heading. ~120 LOC. Lands last; references shipped PRs.

PR-5/PR-6/PR-8 are independent of each other. **Recommended order: PR-6 → PR-5 → PR-8** (biggest test-coverage piece first, doc cleanup second, migration guide last).

## Out of scope

- No new GMI model families. Adding Sora (if/when GMI re-exposes it) is its own ticket.
- No B2 region auto-discovery rework beyond A.3's error-path probe.
- No changes to `PresignedURL`'s redaction shape (A.1 adds siblings).
- No new CLI under `python -m genblaze_gmicloud` — `tools/probe_*.py` already covers it.
- No new `AssetURLPolicy` enum — reuse `URLPolicy` from `genblaze_s3.url_policy`.
- No `URLPolicy.PRESIGNED` write path in the sink — manifests must not carry SigV4. Read-time presigning is on `backend.presigned_get_url()`.
- No SECURITY.md amendment (nothing changes the security posture of provenance records — A.2's design precludes credential-bearing manifests).
- No README-slug doctest infrastructure — `example_slugs`-membership discipline covers it via the existing probe.
- No `make install-dev` addition — already exists at Makefile:21.
