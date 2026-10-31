# WordQuest

A greenfield English vocabulary game library for upper-primary and junior-secondary learners in China.

## T1 technical spike

This branch establishes the first runnable engineering skeleton:

- React + TypeScript + Vite application shell.
- Phaser 4.2.1 loaded as a separate lazy chunk.
- Pointer and keyboard input routed into one game-state reducer.
- IndexedDB local save and restore through a repository wrapper.
- PWA manifest and generated service worker for app-shell caching.
- Vitest unit tests and Playwright browser tests.
- GitHub Actions verification workflow.

The T1 screen is a technical validation lab, not a finished vocabulary game.

## Requirements

- Node.js 24.22.2 (or a compatible Node.js release >=22.12.0).
- pnpm 12.14.0.

## Commands

- pnpm install --no-frozen-lockfile
- pnpm dev
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm test:e2e
- pnpm verify

## T1 acceptance boundary

A passing CI run verifies the automated checks in the workflow. It does not replace manual testing on real Android Chrome, iPhone Safari, Windows Chrome/Edge, low-end devices, or screen readers. Those items remain explicitly unverified until executed and recorded.

## Project boundaries

This repository is independent. It does not inherit source code, APIs, databases, account systems, activity sessions, or test results from classroom-english-word-games. Product-level design documents may inform requirements; old-project implementation code is not a runtime dependency.

See docs/acceptance/T1-技术验证计划.md for the T1 scope and acceptance record.


## P1 shared learning foundation

- [P1 implementation plan and acceptance](docs/architecture/P1-共享底座实现计划与验收.md)
- `packages/content`: runtime content validation and integrity checks.
- `packages/contracts`: shared session/task/event types.
- `packages/learning-core`: answer evaluation, provisional evidence caps and delayed review windows.
- `packages/session-adapter`: pinned, deterministic sessions and restore.
- `packages/storage`: local content/session/event/review persistence with event ID idempotency.
- `apps/api`: read-only content catalog, manifest, content and asset-manifest endpoints.
- `apps/web`: internal-only local learning-core validation lab.

P1 currently uses preview vocabulary packs for internal validation only. It does not implement production game loops, user/guardian identity, activation, cloud sync, or privacy write endpoints.
