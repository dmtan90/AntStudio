# Contributing to genblaze (TypeScript/JavaScript Monorepo)

Thanks for your interest in contributing! This guide will help you get started.

## Development setup

```bash
git clone https://github.com/backblaze-labs/genblaze.git
cd genblaze
npm install
npm run build
```

## Project structure

```
libs/core/              # @genblaze/core TypeScript SDK
libs/connectors/        # Provider adapters (google, openai, s3, etc.)
libs/spec/              # Language-neutral JSON Schemas & TypeScript types
cli/                    # CLI tool
examples/               # Usage examples
docs/                   # Internal feature docs
```

## Running checks

```bash
npm run build           # Full TypeScript monorepo build check
```

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
