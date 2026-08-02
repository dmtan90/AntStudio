# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | Yes       |

## Reporting a vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Use [GitHub Security Advisories](https://github.com/backblaze-labs/genblaze/security/advisories/new) to privately report the vulnerability.

## Security considerations

genblaze handles API tokens and embeds data into media files. Key security boundaries:

- **Provider API tokens** are never stored in manifests or embedded media.
- **`EmbedPolicy`** controls what data gets embedded (prompt redaction, pointer mode).
- **Canonical JSON** ensures hash integrity across serialize/deserialize cycles.
- **Partition paths** in ParquetSink are sanitized to prevent directory traversal.
- **File writes** use atomic temp-file-then-rename to prevent corruption.
