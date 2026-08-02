export interface Manifest {
  schema_version: "1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5";
  run: Run;
  canonical_hash: string;
  manifest_uri?: string | null;
  encryption_scheme?: string | null;
  signature?: string | null;
  transfer_failures?: string[];
}

export interface Run {
  run_id: string;
  tenant_id?: string | null;
  project_id?: string | null;
  name?: string | null;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
  steps: Step[];
  parent_run_id?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  metadata?: { [k: string]: unknown };
}

export interface Step {
  step_id: string;
  run_id?: string | null;
  provider?: string | null;
  model: string;
  step_type?: "generate" | "upscale" | "transcode" | "mix" | "edit" | "custom" | "ingest" | "import";
  model_version?: string | null;
  model_hash?: string | null;
  modality?: "image" | "video" | "audio" | "text";
  prompt?: string | null;
  negative_prompt?: string | null;
  prompt_visibility?: "public" | "private" | "redacted" | "encrypted";
  seed?: number | null;
  params?: { [k: string]: unknown };
  status: "pending" | "submitted" | "processing" | "succeeded" | "failed" | "cancelled";
  inputs?: Asset[];
  assets?: Asset[];
  provider_payload?: { [k: string]: unknown };
  retries?: number;
  cost_usd?: number | null;
  error?: string | null;
  error_code?: "timeout" | "rate_limit" | "auth_failure" | "invalid_input" | "model_error" | "server_error" | "content_policy" | "unknown" | null;
  started_at?: string | null;
  completed_at?: string | null;
  step_index?: number | null;
  metadata?: { [k: string]: unknown };
}

export interface Asset {
  asset_id: string;
  url: string;
  media_type: string;
  sha256?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  metadata?: { [k: string]: unknown };
}
