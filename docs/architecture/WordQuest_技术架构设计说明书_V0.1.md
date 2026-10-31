# WordQuest 英语单词游戏库｜技术架构设计说明书

- 文档版本：TECH-ARCH-V0.1
- 日期：2026-10-31
- 状态：技术方案候选稿，待产品所有者确认冻结
- 目标仓库：`kangshuaibing329/infamous-specter`
- 项目性质：全新独立项目；从零建立代码、接口、数据和部署体系
- 产品基线：WordQuest 十款游戏玩法设计 V1.0、产品总方案 V2、第三层词库映射、跨端规范

> 本文只定义新项目的技术架构，不代表代码已实现、接口已联调、设备已验收或生产环境已部署。旧仓库 `classroom-english-word-games` 的代码、服务端、API、数据库和测试结论均不属于本项目技术基线。

---

## 0. 本版技术决策摘要

| 决策项 | 本版建议 | 决策理由 / 边界 |
|---|---|---|
| 产品形态 | Web + PWA | 手机、平板、Windows/macOS 浏览器共用一套产品；首版不做原生 App |
| 前端壳 | React + TypeScript + Vite | 适合游戏大厅、内容管理、设置、学习报告等复杂 DOM 页面；生态成熟 |
| 2D 游戏运行时 | Phaser 4.2.1（锁定版本） | 面向桌面和移动浏览器的 2D 游戏框架；适合场景、动画、输入和音频 |
| 游戏规则内核 | 纯 TypeScript 模块 | 规则不依赖 Phaser/React，便于单测、确定性重放和未来替换渲染层 |
| UI 与游戏边界 | React DOM + Phaser Canvas 分层 | React 不参与逐帧渲染；游戏内重要文本、提示、焦点和无障碍信息保留 DOM 语义层 |
| 包管理 | pnpm workspaces | 统一管理前端、服务端、共享类型和内容校验工具 |
| 构建编排 | 初期 pnpm scripts；规模增长后再加 Turborepo | 避免 MVP 过早引入额外工程复杂度 |
| 本地数据 | IndexedDB + Dexie | 存词包、会话、事件日志、复习状态和本机设置 |
| PWA | vite-plugin-pwa / Workbox | 管理 manifest、Service Worker、应用壳和静态资源缓存 |
| 服务端 | Fastify + TypeScript 模块化单体 | 新项目独立 API；与前端共享语言和数据合同；不拆微服务 |
| 服务端数据库 | PostgreSQL | 用户授权、激活权益、内容版本、可选同步游标和审计记录 |
| ORM / Schema | Drizzle ORM + Zod | 轻量 SQL 映射与运行时数据校验；数据库迁移可审查 |
| API 描述 | OpenAPI 3.1 | 作为前后端接口合同和联调依据 |
| 自动化测试 | Vitest + Playwright + axe-core | 规则测试、浏览器流程、跨端视口和基础无障碍检查 |
| 部署 | 静态前端 + 独立 API + PostgreSQL + 对象存储/CDN | 资源与 API 分离；具体云厂商、地域、备案与合规部署待确认 |

### 0.1 明确不继承的旧项目内容

以下内容一律不从旧仓库迁移或作为本项目运行依赖：

- 旧仓库的 Python 服务端、活动会话、账号、词库、数据库和 API 路由；
- 旧仓库的 20 款游戏引擎、前端组件、游戏注册表和 UI；
- 旧仓库的分支、提交、测试结论、工作流配置和运行时状态；
- 任何未重新审查授权的音频、图片、字体、动画和第三方素材。

允许参考的是产品层成果：游戏玩法说明、词汇内容定义、学习证据原则、用户体验约束和验收思路。参考不等于复制代码。

### 0.2 当前仍需产品所有者确认的事项

1. 中文品牌名是否继续使用 WordQuest，还是另定名称。
2. 首发是否以初一及某一明确教材版本为唯一正式内容包；现有100词包只能作为候选内容样本，教材覆盖范围需教研复核。
3. G01“词岛大冒险”是否保留为独立游戏，还是仅承担世界地图/大厅功能；本技术架构暂按独立游戏模块预留。
4. G10“岛心巨像”是否吸收独立的单词怪兽战模式；本版不擅自新增第11款。
5. 首发付费权益、激活码、使用期限、退款与内容更新策略。
6. 首发是否要求跨设备同步。本文建议首个可玩版本先实现本机保存，服务端同步作为独立能力开关，不宣传未经验证的自动同步。

---

## 1. 总体架构

```text
                         WordQuest PWA
┌──────────────────────────────────────────────────────────────┐
│                        React 应用壳                           │
│ 首页 / 游戏库 / 内容包 / 个人进度 / 设置 / 家长入口 / 报告      │
├──────────────────────────────┬───────────────────────────────┤
│         React DOM UI         │       Phaser Game Host        │
│ 菜单、文本、提示、焦点、表单  │ 场景、地图、棋盘、动画、音效  │
│ 无障碍语义与辅助操作         │ 触控/鼠标/键盘游戏输入        │
├──────────────────────────────┴───────────────────────────────┤
│                       Application Services                    │
│ GameRegistry / SessionCoordinator / ContentService             │
│ EvidenceService / ReviewService / SaveService / AudioService   │
├──────────────────────────────────────────────────────────────┤
│                        Domain Packages                         │
│ Game Core（纯规则） / Learning Core / Content Schema           │
│ Evidence Contract / Review Policy / Deterministic RNG           │
├──────────────────────────────────────────────────────────────┤
│                         Local Data                              │
│ IndexedDB（词包、会话、事件日志、派生复习状态、设置）            │
│ Cache Storage（版本化静态资源、已下载内容包资源）                │
└──────────────────────────────────────────────────────────────┘
                              │ 可选 HTTPS API
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  新项目独立 API（Fastify）                     │
│ Activation / Entitlement / Content Manifest / Sync / Privacy   │
├──────────────────────────────────────────────────────────────┤
│ PostgreSQL（权益、内容版本、同步元数据、审计）                   │
│ Object Storage + CDN（图片、音频、字体、游戏资源）              │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 关键架构原则

1. **规则与表现分离**：游戏规则由纯 TypeScript core 决定；Phaser 只负责呈现状态和收集输入；动画不能反向决定答案或学习证据。
2. **学习证据与游戏成绩分离**：金币、连击、通关、剩余生命、游戏胜负只属于游戏结果；不能直接转换为单词掌握度。
3. **内容驱动而非硬编码**：词汇、词义、合法拼写、任务模板、音频和例句通过版本化内容包提供。
4. **每款游戏独立核心循环**：共享启动、暂停、输入、音频、存档和证据接口；不共享成一套“答题模板”。
5. **本地优先、服务端可选**：无登录时仍能试玩和本机保存；云同步、权益校验需要真实 API 支持。
6. **确定性可重放**：复杂关卡生成必须有 seed；重要状态变化记录结构化事件，便于复现 bug 和验收。
7. **能力按验证结果承诺**：可打开不等于可离线；本机保存不等于跨设备同步；键盘可操作不等于读屏合格。

---

## 2. 技术栈与版本策略

### 2.1 前端

- React：仅负责产品壳、导航、内容包选择、报告、设置、家长相关 DOM 界面。
- TypeScript：所有业务模块启用严格类型；共享类型集中在 packages/contracts。
- Vite：开发服务器、构建、按需拆包。
- Phaser 4.2.1：首轮候选锁定版本；后续升级必须经游戏回归，不自动跟随 latest。
- Zustand（可选）：仅用于跨页面轻量 UI 状态；游戏状态不放入全局 React store。
- Zod：对导入词包、运行时 API 响应、配置文件进行运行时校验。
- Dexie：IndexedDB 访问和版本迁移；不得绕开 repository 层散落直接读写。

**为什么不用 React 直接画全部游戏？** 10款游戏涉及棋盘、场景、动画、碰撞、音频和连续输入；把高频帧状态放进 React 会增加不必要的组件更新。React 负责应用 UI，Phaser 负责游戏画布，规则层独立，职责更清楚。

**为什么不直接选 Preact？** Preact 体积更小，但本项目除游戏 HUD 外还有较多 DOM 页面、表单、报告、无障碍与生态集成需求。初期 React 的生态与团队可维护性更重要。通过路由懒加载和游戏动态分包控制首屏体积，而不是为节省少量框架体积牺牲开发便利。

### 2.2 Phaser 使用边界

- 锁定 Phaser `4.2.1`；安装时写入精确版本并提交 lockfile。
- 一个活动游戏页面原则上只保留一个活动 Phaser.Game 实例；离开游戏必须销毁/清理场景、音频、计时器、输入监听和纹理引用。
- 每款游戏采用独立 `GameModule` + Scene 组合；禁止多个游戏组件各自创建互不管理的常驻 Phaser 实例。
- Phaser 不拥有词库、复习状态或权威学习证据；通过应用服务接收已校验的任务和提交结构化游戏动作。
- 所有关键指令同时提供 DOM/键盘可达路径；若某款玩法确实无法满足读屏，应在规格阶段设计 DOM/SVG 替代交互，不等到上线前补救。
- WebGL 不可用或设备能力不足时，按游戏能力选择 Canvas/DOM 降级；不承诺所有视觉效果完全一致。

### 2.3 后端与部署

首版建议采用**模块化单体**，不做微服务：

- Fastify：REST API、鉴权钩子、速率限制、请求校验。
- PostgreSQL：用户/监护人授权关系（如启用）、激活权益、内容包发布版本、同步元数据、操作审计。
- Drizzle：数据库 schema 和迁移。
- 对象存储/CDN：版本化音频、图片和静态资源；文件名带内容 hash。
- Redis：首版不引入。只有出现明确的缓存、队列或限流需求后再评估。
- 支付：首版不直接在学生游戏内接入支付；如通过小红书等外部渠道销售，激活流程另行设计和合规评估。

部署云厂商、数据中心地域、ICP备案、未成年人个人信息处理方案、监护人同意流程均为【待确认】。在确认部署地域与合规要求前，不得把开发环境配置当作生产部署方案。

---

## 3. 游戏库插件架构

### 3.1 Game Registry

游戏元数据通过注册表管理，游戏大厅不写死十份页面代码。

```ts
export type GameId =
  | 'g01-island-exploration'
  | 'g02-spelling-minecart'
  | 'g03-word-link'
  | 'g04-word-block-match'
  | 'g05-sonic-skate'
  | 'g06-morph-factory'
  | 'g07-sentence-bridge'
  | 'g08-confusable-detective'
  | 'g09-clue-dungeon'
  | 'g10-island-core-titan';

export interface GameManifest {
  id: GameId;
  version: string;
  title: string;
  description: string;
  ageBands: Array<'primary-upper' | 'junior-secondary'>;
  primaryDimensions: LearningDimension[];
  inputCapabilities: Array<'tap' | 'drag' | 'keyboard' | 'pointer'>;
  orientation: 'portrait-first' | 'landscape-optional' | 'adaptive';
  assetManifestVersion: string;
  load: () => Promise<{ create: GameFactory }>;
}
```

### 3.2 统一游戏模块接口

```ts
export interface GameContext {
  sessionId: string;
  seed: string;
  contentPackId: string;
  contentPackVersion: string;
  tasks: WordTask[];
  difficulty: DifficultyProfile;
  inputMode: InputMode;
  reducedMotion: boolean;
  audioEnabled: boolean;
}

export interface GameController {
  mount(host: HTMLElement): Promise<void>;
  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  dispatch(action: GameAction): void;
  getSnapshot(): GameSnapshot;
  restore(snapshot: GameSnapshot): Promise<void>;
  dispose(): Promise<void>;
  subscribe(listener: (event: GameDomainEvent) => void): () => void;
}

export interface GameFactory {
  create(context: GameContext, services: GameServices): GameController;
}
```

接口约束：

- `GameAction` 表示玩家意图，不是客户端自行宣告的正确答案。
- `GameDomainEvent` 表示规则层已经计算出的状态变化，如 `pair_matched`、`track_piece_built`、`clue_selected`。
- `StudyEvidence` 只能由 Learning Core 根据任务合同、提示情况和判题结果生成；游戏动画层不能直接写掌握度。
- `getSnapshot/restore` 只保存必要逻辑状态；纹理、音频实例、DOM 节点不能序列化进存档。
- `dispose()` 必须可重复调用且无副作用，清除监听、计时器、音频和资源引用。

### 3.3 十款游戏的技术边界

| ID | 游戏 | 独立规则内核重点 | 主要输入 | 关键测试 |
|---|---|---|---|---|
| G01 | 词岛大冒险 | 环境机关、地形状态、分支路径、主路可达 | 点选/键盘/轻拖动 | 机关覆盖、无死锁、路线反事实重放 |
| G02 | 拼写矿车 | 字母序列、拼写校验、轨道部件生成 | 点击排序/键盘输入/拖动 | IME组合态、合法变体、先判后演 |
| G03 | 词语连连看 | 棋盘配对、路径合法性、障碍/传送门、死局重排 | 点击/键盘 | 生成器可解、策略模拟、事件回放 |
| G04 | 词块消消乐 | 语义目标驱动交换、消除、连锁约束 | 触控滑动/点击/鼠标 | 随机消除不能产生学习证据；躺平对照 |
| G05 | 音速滑板 | 音频目标、路线选择、慢速逻辑时钟 | 触控/方向键 | 音频失败降级、帧率不影响判定 |
| G06 | 变形工厂 | 词根词缀部件组合、词形规则校验 | 拖动/点选 | 词形规则、N/A项、组合合法性 |
| G07 | 句桥救援 | 词块顺序、句法结构、语境约束 | 拖动/键盘排序 | 多个合法句式、内容审核、替代输入 |
| G08 | 易混词侦探城 | 易混词对比、结构化证据选择 | 点选/键盘 | 对比词组绑定、理由项有效性 |
| G09 | 线索地牢 | 多线索顺序、候选集合、假设排除 | 点选/拖动 | 候选集约束、线索组合、换词/放弃机制 |
| G10 | 岛心巨像 | 多阶段任务编排、阶段状态、跨维度复现 | 多种输入 | 阶段状态机、阶段重放、延迟无提示复现 |

注：十款名册沿用最新玩法设计文档。若产品所有者最终调整 G01/G10 定义，只变更 manifest 和相应模块规格，不改变共享 Learning Core 的基本职责。

---

## 4. Learning Core 学习引擎

### 4.1 组成

```text
LearningCore
├── WordBank              词汇/词义读取与内容版本
├── TaskFactory           生成识义、听辨、拼写、词形、语境任务
├── SessionPlanner        新词、复习词、错词与任务混排
├── AnswerEvaluator       按任务合同判断响应
├── HintPolicy            记录提示等级与证据上限
├── EvidenceRecorder      生成不可重复的学习事件
├── ReviewScheduler       首版规则式复习调度
└── LearningSummary       按五维聚合证据，不合并成误导总分
```

### 4.2 五维能力

- `meaning`：识义。看到英文能独立提取词义。
- `listening`：听辨。听到发音能辨认目标词。
- `spelling`：拼写。无完整拼写提示下产出正确拼写。
- `morphology`：词形。理解复数、时态、派生等适用规则；不适用项允许 `N/A`。
- `context`：语境。在短语/句子中理解和使用词义、搭配。

证据粒度以 `word_id + sense_id + dimension + task_type` 为基础。一个拼写对应多个词义时，必须拆分 sense，不得把不同义项的正确率混在一起。

### 4.3 E0–E3 证据等级（待最终冻结）

| 等级 | 建议语义 | 示例 | 不可推断 |
|---|---|---|---|
| E0 | 接触/有提示参与 | 看词、听音、跟随示范 | 不代表识别或回忆 |
| E1 | 有支持的识别 | 有选项、部分字母、明确提示 | 不等于独立提取 |
| E2 | 同次练习中的无提示提取 | 不显示答案的识义、听辨、拼写 | 不代表长期保持 |
| E3 | 延迟且跨形式提取 | 间隔后换游戏/任务无提示正确 | 不代表永久掌握 |

提示、重试、候选数量、辅助方式和任务类型都必须影响证据等级上限。具体评分映射、48小时窗口和证据上限须形成可执行测试表后才能冻结；不得直接把“答对”统一记为 E2。

### 4.4 任务合同

```ts
export type LearningDimension =
  | 'meaning' | 'listening' | 'spelling' | 'morphology' | 'context';

export interface WordTask {
  taskId: string;
  wordId: string;
  senseId: string;
  dimension: LearningDimension;
  taskType: 'image_recognition' | 'audio_recognition' | 'meaning_retrieval'
    | 'spelling_production' | 'morphology_choice' | 'context_completion'
    | 'contrast_reasoning' | 'sentence_construction';
  promptRef: string;
  optionRefs?: string[];
  answerSpecRef: string;
  acceptedVariantSetId?: string;
  hintPolicyId: string;
  evidenceCap: 'E0' | 'E1' | 'E2' | 'E3';
  contentPackVersion: string;
}
```

答案内容和正确答案规则不应散落在十款游戏组件中；由任务合同与 AnswerEvaluator 单点管理。客户端本地模式的事件需标注 `origin=local`，不能伪装成服务端核验。

---

## 5. 内容模型与导入

### 5.1 内容实体

- `Word`：词形本体，例如 `bank`。
- `Sense`：具体词义项，例如“银行”或“河岸”。
- `Pronunciation`：音标、口音标签、音频资源引用和来源。
- `Example`：例句、翻译、适用年级和审核状态。
- `Asset`：图片/音频/字体/动画资源及许可元数据。
- `ContentPack`：教材版本、年级、单元、版本号、发布日期、校验和。
- `TaskTemplate`：某个词义项可生成的任务类型、提示策略和证据上限。
- `ContrastPair`：易混词配对及具体对比维度。

### 5.2 关键字段

```ts
interface WordRecord {
  wordId: string;
  lemma: string;
  partOfSpeech: string[];
  senses: SenseRecord[];
  gradeTags: string[];
  curriculumRefs: CurriculumRef[];
  sourceRefs: SourceRef[];
}

interface SenseRecord {
  senseId: string;
  glossZh: string;
  definitionEn?: string;
  pronunciationRefs: string[];
  exampleRefs: string[];
  imageAssetRefs: string[];
  acceptedSpellings?: string[];
  morphologyRules?: MorphologyRule[];
  tags: string[];
  reviewStatus: 'draft' | 'reviewed' | 'approved' | 'retired';
}

interface ContentPackManifest {
  packId: string;
  version: string;
  schemaVersion: string;
  title: string;
  gradeBand: string;
  curriculum: string;
  unitRefs: string[];
  wordCount: number;
  assetManifestHash: string;
  contentHash: string;
  publishedAt: string;
}
```

### 5.3 导入流程

1. 支持 JSON/CSV/XLSX 模板导入；首版先保证 CSV 与 JSON 稳定。
2. 导入预检：必填字段、编码、空值、重复 word_id/sense_id、引用缺失、非法枚举。
3. 语义校验：多义词是否拆 sense；拼写变体是否显式配置；例句是否有审核状态；音频是否匹配词义项。
4. 资源校验：文件存在、MIME 类型、大小、hash、来源与许可字段。
5. 预览差异：新增、修改、停用、冲突；不得静默覆盖已发布内容。
6. 生成不可变版本包，写入 manifest 与 content hash。
7. 发布后旧版本保留一段兼容窗口；正在进行的会话固定使用启动时的内容包版本。

### 5.4 内容质量门

- 未审核词条不能进入公开正式包。
- 不声称“全人教版/全教材覆盖”，除非逐单元核对并有教研记录。
- 图片、音频、字体、例句的来源、许可、授权范围和撤回方式必须可追溯。
- 缺音频时使用明确降级任务；不能将浏览器语音合成当作跨设备一致的标准发音。

---

## 6. 本地数据、存档与同步

### 6.1 IndexedDB 表建议

| 表 | 主键 | 作用 | 是否可重建 |
|---|---|---|---|
| `profiles` | `profileId` | 本机匿名学习档案 | 否（可备份） |
| `contentPacks` | `packId:version` | 已安装词包 manifest 与索引 | 可重新下载 |
| `words` | `packId:version:wordId` | 词条 | 可重新下载 |
| `senses` | `packId:version:senseId` | 词义项 | 可重新下载 |
| `assets` | `assetId:version` | 本地资源元数据/缓存状态 | 可重新下载 |
| `sessions` | `sessionId` | 游戏会话与快照 | 部分可重建 |
| `studyEvents` | `eventId` | 追加式学习证据事件 | 不可丢；可由备份恢复 |
| `gameEvents` | `eventId` | 可重放游戏状态事件 | 按留存策略保留 |
| `reviewStates` | `profileId:wordId:senseId:dimension` | 当前复习状态 | 是，由证据重算 |
| `settings` | `key` | 音效、动画、输入偏好 | 否（可重置） |
| `syncMetadata` | `profileId` | 同步游标与冲突信息 | 是 |

### 6.2 保存策略

- `studyEvents` 与 `gameEvents` 采用追加写；不直接覆盖历史证据。
- 每次重要状态转移后写入 session snapshot；快照只保存恢复所需最小字段。
- `reviewStates`、进度摘要和图鉴为派生数据，可从事件日志重建。
- 事务内保证事件写入与快照推进一致；写入失败时暂停并提示，不假装保存成功。
- IndexedDB schema 采用显式版本迁移；迁移失败时保留原数据并提供恢复提示。
- 用户清除数据、卸载 PWA 或浏览器回收存储可能导致本机进度丢失；在未完成备份/恢复测试前，不承诺永久保存。

### 6.3 离线与跨设备边界

| 能力 | 首个可玩版本 | 对外口径 |
|---|---|---|
| 在线游玩 | 支持 | 可用网络加载游戏与词包 |
| 已缓存词包离线游玩 | 作为目标，逐款验证 | 仅对已下载且版本兼容的词包有效 |
| 同设备刷新/关闭恢复 | 需通过真实测试 | 测试通过后才能承诺 |
| 手机与电脑跨设备同步 | 暂不承诺 | 需要账号/授权、服务端同步和冲突合并 |
| 本地导出/备份码 | 后续阶段 | 未实现前不宣传 |

---

## 7. 新项目 API 边界

API 只定义本项目新服务端，不沿用旧仓库路径或字段。首个纯本地原型可不启动 API；进入付费试点前，至少需要激活权益和内容包发布能力。

### 7.1 建议 API

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/v1/health` | 服务健康检查 | 服务端基础 |
| GET | `/api/v1/content-packs` | 获取可用内容包清单 | 付费试点前 |
| GET | `/api/v1/content-packs/{packId}/versions/{version}/manifest` | 获取内容包 manifest | 付费试点前 |
| POST | `/api/v1/activation/redeem` | 兑换外部购买的激活码 | 商业化试点前 |
| GET | `/api/v1/entitlements` | 查询当前设备/档案权益 | 商业化试点前 |
| POST | `/api/v1/sync/batches` | 批量提交本地事件 | 跨设备同步阶段 |
| GET | `/api/v1/sync/changes?cursor=` | 拉取增量变化 | 跨设备同步阶段 |
| POST | `/api/v1/privacy/export` | 发起数据导出 | 家长/隐私阶段 |
| POST | `/api/v1/privacy/delete` | 发起数据删除 | 家长/隐私阶段 |

### 7.2 API 设计规则

- 所有请求/响应均有 Zod schema 与 OpenAPI 定义。
- 错误响应统一为 `{ code, message, requestId, retryable }`；面向儿童的提示由前端映射为易懂文案。
- 写操作必须有 `Idempotency-Key` 或稳定 `eventId`；重复请求不得重复发放权益或重复计入事件。
- 内容接口使用不可变版本号和 hash；会话中途不静默换包。
- 服务器端不信任客户端提交的掌握度、正确率总数、奖励总数或最终游戏状态；服务端按允许的事件与规则校验。
- 本地模式和服务端确认模式必须可区分；不能把本机计算结果伪装成云端权威结果。
- 不采集原始键盘/触控时间序列用于画像；只保留验证所需的最小事件字段。

### 7.3 账号与儿童数据

- 先评估是否确实需要学生账号；优先匿名本机档案。
- 如需监护人关联、购买权益或云同步，单独设计监护人身份、同意、撤回、导出、删除和数据保留流程。
- 默认不采集真实姓名、学校、班级、精确位置、通讯录和非必要设备标识。
- 不提供公开儿童排行榜、陌生人私聊、陌生人匹配和强制邀请奖励。
- 目标市场为中国未成年人，生产上线前须由合格法律/合规人员核验适用法规、个人信息处理依据、监护人同意和数据存储地域；本技术文档不构成法律意见。

---

## 8. 输入、响应式布局与无障碍

### 8.1 统一输入抽象

所有游戏使用同一套输入语义：

```ts
type InputMode = 'touch' | 'mouse' | 'keyboard' | 'mixed';
type GameAction =
  | { type: 'SELECT'; targetId: string }
  | { type: 'MOVE'; fromId: string; toId: string }
  | { type: 'SUBMIT'; value: string }
  | { type: 'CANCEL' }
  | { type: 'HINT_REQUEST'; hintLevel: number }
  | { type: 'PAUSE' };
```

- 触控、鼠标、键盘最终映射为同一类语义动作。
- 不允许 hover 成为唯一信息入口。
- 拖动必须有点击选择/键盘替代路径；高精度拖动不作为学习能力判断。
- 拼写输入必须正确处理 IME compositionstart/compositionend；输入法组合态不得提前判错。
- 游戏操作失误与语言回答错误分开记录；`inputError` 不进入掌握度计算。

### 8.2 参考视口

- 手机：360×640、390×844；另测窄屏、旋转和浏览器地址栏收缩。
- 平板：768×1024、1024×768。
- 桌面：1280×720、1366×768、1920×1080。
- 触控目标建议至少 44×44 CSS px（空间允许时）；文字不能仅靠颜色传达正误。
- 手机竖屏优先；G05 等个别游戏可提示横屏，但不强迫全产品统一横屏。

### 8.3 无障碍硬要求

- 键盘 Tab/方向键/Enter/Space 有清晰焦点和可预测顺序。
- 重要游戏状态通过 DOM live region 或等价方式提供文本反馈。
- 提供减少动态效果、静音、暂停和非听音替代路径。
- 颜色不是唯一状态信号；字幕/图标/文字辅助辨识。
- 若 Phaser Canvas 游戏无法满足读屏关键流程，必须提供 DOM/SVG 等价交互或调整该游戏玩法；不能以“游戏画布本来就不支持”为理由跳过。

---

## 9. 资源与性能

### 9.1 资源规范

- 资源使用 manifest 管理：`assetId`、类型、URL、hash、尺寸/时长、许可来源、作者、版本、用途范围。
- 图片优先 WebP/AVIF（保留兼容回退）；音频优先按需加载，统一响度与采样率需教研/音频验收。
- 每款游戏动态导入，不把十款游戏全部打进首屏 bundle。
- 字体仅加载实际使用字重；中文字体优先系统字体栈，避免首屏下载大字体。
- 第三方素材在许可审查通过前不得进入正式包。

### 9.2 初始性能预算（候选门槛，需目标设备验证）

| 指标 | 目标 | 说明 |
|---|---:|---|
| 应用壳 JS gzip | ≤200 KB | 不含 Phaser 与单款游戏代码；超限需拆包复核 |
| 单款游戏增量 JS gzip | ≤450 KB | 按需加载；复杂游戏单独说明例外 |
| 首屏可交互 | 目标 ≤3 秒 | 在约定中低端设备和网络条件下测量 |
| 稳态帧率 | 目标 30 FPS 以上 | 低端设备实测；不把帧率用于学习评分 |
| 单局内存 | 不持续增长 | 退出游戏后纹理、音频、事件监听释放 |

以上是工程预算，不是已测结果。正式阈值要在目标安卓机、iPhone、平板和桌面浏览器上采样后冻结。

### 9.3 音频策略

- 优先使用有授权、质量稳定的预录发音；记录美式/英式等口音元数据。
- 浏览器 SpeechSynthesis 只作为降级，不作为标准音频来源或学习成绩依据。
- 处理 iOS Safari 音频解锁、静音、耳机切换、播放失败、重复播放和页面切后台。
- 用户可关闭音效；关闭游戏音效不应自动关闭必要的学习音频字幕替代。

---

## 10. 项目目录结构

建议新仓库采用 pnpm monorepo，但保持模块化单体，不拆微服务。

```text
infamous-specter/
├── apps/
│   ├── web/                         # React + Vite PWA 学生端
│   │   ├── src/app/                  # 路由、providers、应用入口
│   │   ├── src/pages/                # Home、Library、Game、Progress、Settings
│   │   ├── src/components/           # DOM UI 组件
│   │   ├── src/game-host/            # Phaser 容器与生命周期管理
│   │   ├── src/services/             # 应用服务编排
│   │   └── public/                   # manifest、静态图标
│   └── api/                          # Fastify API（商业化/同步阶段启用）
│       ├── src/modules/              # activation、content、sync、privacy
│       ├── src/plugins/              # auth、validation、rate-limit
│       └── src/db/                   # Drizzle schema 与 migrations
├── packages/
│   ├── contracts/                    # API、事件、任务、数据类型与 Zod schema
│   ├── game-core/                    # 纯规则、seed RNG、reducer、状态机
│   ├── game-runtime/                 # Phaser adapter、输入、音频、资源管理
│   ├── games/                        # g01 ... g10 独立模块
│   ├── learning-core/                # WordBank、TaskFactory、Evidence、Review
│   ├── content-schema/               # 词包 schema、导入和校验
│   ├── content-packs/                # 经审核发布的词包（独立版本）
│   ├── storage/                      # IndexedDB/Dexie repositories
│   ├── ui/                           # 共享 DOM 组件、设计 token
│   └── config/                       # tsconfig、eslint、test presets
├── tools/
│   ├── content-validator/             # 词包/素材许可/引用检查
│   ├── seed-audit/                    # 关卡生成和策略模拟
│   └── bundle-report/                 # 构建体积预算检查
├── docs/
│   ├── architecture/                 # 技术架构与 ADR
│   ├── game-specs/                   # 每款游戏详细规格
│   ├── content/                      # 词库规范和教研流程
│   ├── privacy/                      # 数据清单、保留与删除
│   └── acceptance/                   # 验收用例与设备矩阵
├── .github/workflows/                # CI
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.base.json
├── eslint.config.js
├── README.md
└── LICENSE
```

### 10.1 依赖方向

允许：

- `apps/web` → `packages/*`
- `apps/api` → `packages/contracts`、`packages/content-schema`
- `packages/games/*` → `game-core`、`learning-core` 的公共接口、`contracts`
- `game-runtime` → Phaser 与 `contracts`

禁止：

- `learning-core` 依赖 Phaser、React 或 DOM。
- `game-core` 依赖任何 UI 框架。
- 单款游戏直接读写 IndexedDB 或调用 API。
- 单款游戏直接修改掌握度/复习日期。
- UI 组件绕过应用服务直接拼装游戏规则。

---

## 11. 测试体系与验收标准

### 11.1 测试分层

| 层级 | 工具/方式 | 必测内容 |
|---|---|---|
| 规则单测 | Vitest | 状态机、判题、路径、拼写变体、候选集、边界值 |
| 属性/随机测试 | Vitest + seeded generators | 关卡可解、无非法状态、状态转移不变量 |
| 重放测试 | event reducer + seed | 同 seed/事件序列重放结果一致 |
| 内容测试 | content-validator | schema、重复 ID、sense 关联、素材引用、许可字段 |
| 组件测试 | Testing Library | 菜单、表单、键盘焦点、提示和报告 |
| 浏览器 E2E | Playwright | 开始、教程、主循环、暂停、恢复、胜负、退出、重进 |
| 无障碍 | axe-core + 人工 | DOM 语义、键盘、读屏关键路径、减少动态效果 |
| 跨端真机 | Android Chrome、iOS Safari、Windows Chrome/Edge | 触控、音频、IME、存档、视口、低端性能 |
| 发布检查 | CI + 人工签核 | 构建、依赖许可、资源授权、回滚和版本兼容 |

### 11.2 每款游戏统一状态验收

每款游戏至少覆盖：

1. 首次启动、再次进入、从大厅返回；
2. 教程开始、跳过、重看；
3. 正确操作、错误操作、提示、撤销/重试；
4. 暂停、恢复、切后台、刷新/关闭恢复（如该版本承诺）；
5. 胜利、失败、主动退出；
6. 重复事件提交和重复结算；
7. 缺词、空词包、音频/图片缺失、内容版本不兼容；
8. 触控、鼠标、键盘等价操作；
9. reduced motion、静音和低动态模式；
10. 资源释放、控制台错误和事件重放一致性。

### 11.3 生成器专项门

- 棋盘/路径/组合类游戏必须使用固定 seed 复现。
- 复杂策略关卡候选最低审计量：10,000 seeds × 20 strategies；实际门槛按游戏复杂度分别定义。
- 必须包含正常策略、随机策略、固定错误/不输入等反事实对照，检验语言操作是否真正影响局面。
- “生成成功率”“通关率”“学习证据密度”分别统计，不互相替代。
- 不通过时禁止以增加随机奖励、自动代答或降低语言要求掩盖问题。

### 11.4 公开发布门

公开 V1 若宣传十款游戏，十款均必须达到：可完整开局、可完成主循环、胜负条件真实、学习事件可追溯、触控/键盘可用、资源授权清楚、设备回归完成。只有封面或可点击入口不算完成。

---

## 12. 分阶段实施路线

| 阶段 | 交付 | 不进入下一阶段的条件 |
|---|---|---|
| T0 技术冻结 | 本文裁决、ADR、游戏注册表、数据合同、首发边界 | 技术栈/数据边界/首发范围未确认 |
| T1 项目骨架 | monorepo、CI、React/PWA 壳、Phaser Host、基础路由 | 构建、类型检查、基础 E2E 不通过 |
| T2 共享底座 | Game Registry、GameController、输入/音频/资源生命周期、IndexedDB | 插件不能独立挂载/卸载，存档不能恢复 |
| T3 Learning Core | 词库 schema、TaskFactory、判题、证据、复习策略 | 五维和 E0–E3 不能被测试准确区分 |
| T4 首款纵切 | 先选一款玩法独立且可测的游戏，建议 G03 或 G02 做技术验证 | 真机、键盘、触控、重放、资源释放不通过 |
| T5 三款先导 | 根据产品最终裁决确定三款，完成审核词包和可玩关卡 | 首玩理解、完成率、复玩和学习证据未达预注册门槛 |
| T6 扩展十款 | 逐款实现、逐款验收，不并行制造十个半成品 | 任一游戏核心循环或学习证据不成立 |
| T7 商业化与云服务 | 激活码、权益、内容发布、可选同步、家长/隐私流程 | 权益安全、删除、恢复和合规评审未通过 |
| T8 发布 | 双端真机、低端性能、无障碍、素材许可、回滚 | 任一公开承诺未验证 |

建议两名开发者从零实现完整十款的排期先按 10–16 周作为粗略区间，但本次架构重新设计后需要以 T1/T2 的实际产出校准，不作为工期承诺。

---

## 13. 风险清单

| 风险 | 可能后果 | 控制措施 |
|---|---|---|
| Phaser Canvas 无障碍不足 | 读屏用户无法完成关键流程 | 关键 UI 使用 DOM；先做一款读屏可行性试验 |
| 十款共用一套答题流程 | 游戏换皮、趣味性不足 | 规则层独立；逐款核心循环和反事实测试 |
| 学习事件被动画/客户端伪造 | 掌握度报告不可信 | 证据由 Learning Core 统一生成；服务端不信任客户端摘要 |
| 词库多义项混淆 | 统计失真 | word_id + sense_id 作为最小内容与证据粒度 |
| PWA 离线承诺过度 | 用户断网无法继续或丢档 | 缓存版本矩阵、同设备恢复和跨设备同步分开验收 |
| iOS 音频/存储行为差异 | 听力玩法和存档异常 | iOS Safari 专项真机测试；必要时明确降级 |
| 低端机性能不足 | 动画卡顿、输入丢失 | 单游戏懒加载、粒子回收、逻辑时钟与真机采样 |
| 内容版权不清 | 下架/投诉 | 素材许可清单、来源留档、撤回机制 |
| 未成年人数据处理不当 | 合规和信任风险 | 最小采集、家长控制、上线前专项合规审查 |
| 范围膨胀 | 迟迟无法交付 | 先做一款纵切，再扩三款，最后扩十款 |

---

## 14. 本版验收与待办

### 已完成（文档层）

- [x] 确立新项目独立技术架构，不依赖旧仓库代码和 API。
- [x] 确定前端壳、游戏运行时、规则层、学习引擎和本地存储的职责边界。
- [x] 定义十款游戏插件接口方向。
- [x] 定义五维学习证据和内容数据模型方向。
- [x] 定义本地保存、离线、同步能力边界。
- [x] 定义项目目录、测试分层和阶段路线。

### 尚未完成（需要下一轮细化）

- [ ] 产品所有者确认本版技术栈与首发范围。
- [ ] 完成 ADR-001：React + Phaser 版本锁定与首屏 bundle 验证。
- [ ] 完成 ADR-002：匿名本机档案、激活码、账号与同步的先后顺序。
- [ ] 冻结 `GameManifest`、`GameController`、`GameAction`、`GameDomainEvent` 的正式 TypeScript 类型。
- [ ] 冻结 `WordTask`、`StudyEvidence`、E0–E3、提示与重试的完整字段及评分矩阵。
- [ ] 完成数据库 ER 图、索引、迁移与删除策略。
- [ ] 完成 OpenAPI 初版及错误码表。
- [ ] 选定首个技术纵切游戏并完成验收用例。
- [ ] 确认目标设备清单、部署地域、隐私和监护人流程。

**本版结论：技术方案候选稿已形成，尚未冻结，不进入正式游戏功能编码。下一步应先做技术选型小型验证（React + Phaser 4.2.1 + PWA + IndexedDB），再完成正式接口与数据库设计。**

---

## 15. 参考资料

- Phaser 官方下载页：<https://phaser.io/download>（当前官方页面列出 Phaser 4.2.1）
- Phaser 4 官方文档：<https://www.phaser.io/oss/docs/>
- Phaser 4 安装指南：<https://phaser.io/oss/docs/phaser/getting-started/installation>
- Phaser GitHub Releases：<https://github.com/phaserjs/phaser/releases>
- vite-plugin-pwa 文档仓库：<https://github.com/vite-pwa/docs>

外部版本信息核对日期：2026-10-31。正式初始化项目时再次核实依赖最新补丁、许可证和浏览器兼容性，并将确切版本写入 lockfile。