# WordQuest — English Vocabulary Game Library

A greenfield, cross-device English vocabulary game library for upper-primary and junior-secondary learners in China.

## Project status

- Product and game-design materials are being consolidated.
- Technical architecture: candidate draft, not yet frozen.
- No production game code has been implemented in this repository.
- This repository is independent. It does not inherit code, APIs, backend services, databases, game engines, or test results from `classroom-english-word-games`.

## Current architecture document

- [WordQuest Technical Architecture v0.1](docs/architecture/WordQuest_技术架构设计说明书_V0.1.md)

## Principles

- Ten genuinely distinct game loops, not ten skins over one quiz.
- Shared vocabulary content and learning-evidence contracts.
- Game score and learning mastery remain separate.
- Mobile and desktop browser support, with PWA as the initial delivery target.
- No child-facing public leaderboard, stranger chat, ads, paid revives, or manipulative streak mechanics.

## Repository policy

All code, APIs, data models, workflows, tests, and deployment configuration are designed for this repository from scratch. Existing WordQuest planning documents may inform product requirements, but old-project source code is not migrated.
