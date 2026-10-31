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


## P0-0 baseline and contracts

- [P0-0 baseline](docs/acceptance/P0-0-基线冻结与核心契约核对.md)
- [P0-0.1 game registry review](docs/acceptance/P0-0.1-游戏注册表冻结与独立性审查.md)
- [P0-0.2 multi-pack vocabulary design](docs/acceptance/P0-0.2-多版本词库与用户选择设计.md)
- [P0-0.3 learning evidence policy](docs/acceptance/P0-0.3-五维学习证据与E0-E3测试矩阵.md)
- [P0-0.4 API/event contract review](docs/acceptance/P0-0.4-新项目API与事件契约审查.md)
- [P0-0.5 quality gates](docs/quality/P0-0.5-质量门与测试计划.md)
- [P0-0.6 stage acceptance report](docs/acceptance/P0-0.6-跨文档审查与阶段验收报告.md)

P0-0 documents and schemas are candidate design artifacts. They do not imply that production games, APIs, learning logic, official vocabulary packs, real-device tests, or pilot studies are complete.

## P0-1 vocabulary packs

- [Vocabulary pack index](content-packs/README.md)
- [Content QA and editorial checklist](content-packs/CONTENT-QA-首批三套词包教研验收说明.md)
- [P0-1 delivery and static QA report](docs/acceptance/P0-1-首批通用词包交付与静态验收报告.md)
- [Morphology rules](content-packs/morphology-rules.v1.json)
- [Support policies](content-packs/support-policies.v1.json)
- [Answer specs](content-packs/answer-specs.v1.json)

The three packs are preview-only drafts. IPA, definitions, examples, source verification, rights review, audio and runtime import are not yet approved.

- [P0-1 0.2.0 vocabulary expansion and static QA report](docs/acceptance/P0-1-词库扩充0.2.0静态验收报告.md)
- [Audio production specification](content-packs/AUDIO-PRODUCTION-SPEC.md)
- [0.2.0 content quality matrix](content-packs/CONTENT-QA-MATRIX-v0.2.0.md)

- [P0-1 first editorial review of all 317 vocabulary entries](docs/acceptance/P0-1-317词条第一轮内容编辑审查报告.md)
- [US English and pronunciation verification register](content-packs/review/0.2.0/PRONUNCIATION-AND-US-ENGLISH-CHECKS.md)
