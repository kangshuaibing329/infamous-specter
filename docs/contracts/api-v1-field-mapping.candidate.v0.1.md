# WordQuest 新项目 API v1 字段映射候选表

- 版本：API-V1-MAPPING-CANDIDATE-0.1
- 适用仓库：`kangshuaibing329/infamous-specter`
- 分支：`codex/p0-0-baseline-contracts`
- 状态：候选字段映射；不是已实现 API，也不是运行时 fixture
- 依据：TECH-ARCH-V0.1、P0-0 基线冻结与核心契约核对 V0.1

> 本文件只定义新项目的 `/api/v1/*` 字段来源与权威边界。旧仓库 `classroom-english-word-games` 的 `/api/activity/*`、旧 g3、旧数据库字段均不适用。

---

## 1. 字段来源与权威归属

| 字段 | 产生方/唯一来源 | 客户端是否可改写 | 服务端处理 | 说明 |
|---|---|---|---|---|
| `gameId` | Game Registry | 否 | 校验是否存在且可用 | 不接受未注册游戏 ID |
| `gameVersion` | Game Manifest | 否 | 校验版本兼容性 | 版本用于复现与兼容 |
| `logicVersion` | Game Core 发布版本 | 否 | 按版本验证或拒绝 | 重放不能静默使用新规则 |
| `schemaVersion` | Contracts 包 | 否 | 校验并按兼容策略处理 | 不兼容必须明确返回错误 |
| `sessionId` | SessionCoordinator | 仅可引用，不可复用到别局 | 绑定会话 | 首个本地版本可本地生成；服务端是否分配/确认待冻结 |
| `eventId` | EventRecorder | 不得重复 | 幂等去重 | 稳定唯一；重复提交不得重复计数 |
| `idempotencyKey` | 写请求客户端 | 不得在重试时变化 | 写操作幂等 | 与 eventId 的职责和优先级待 API 实现前冻结 |
| `contentPackId/version` | ContentPackManifest | 否 | 校验内容版本 | 会话中途不静默切换版本 |
| `wordId/senseId` | 已审核内容包 | 否 | 校验任务是否引用该词/义项 | 每个任务唯一绑定一个 sense |
| `taskId/taskVariantId` | TaskFactory / TaskTemplate | 否 | 校验任务版本与配置 | 不允许客户端临时编造任务 |
| `dimension/taskType` | TaskTemplate | 否 | 与任务合同对照 | 不从动画、分数或路线反推维度 |
| `evidenceCap/hintPolicyId` | TaskTemplate / Learning Policy | 否 | 重新计算或核验 | 不能由客户端把 E1 升成 E2/E3 |
| `supportLevel/hintState` | Learning Core 记录的辅助状态 | 不能伪造为更低支持 | 参与证据上限判定 | 选项、部分字母、提示、支援等均需可追溯 |
| `attemptIndex/retryState` | Session/Learning Core | 不能通过重复请求重置 | 去重并按会话顺序校验 | 首答与重试必须分开 |
| `answerIntent` | Input Adapter 转换后的最小答案意图 | 可提交意图，不可提交权威结论 | 按任务/内容版本判题 | 不保留原始键盘/触控时序 |
| `verdict` | AnswerEvaluator；在线最终由服务端确认 | 不接受客户端作为权威值 | 服务端按任务合同重判 | 本地结果标记 local，不伪装 server-confirmed |
| `evidenceLevel` | Learning Core / 服务端证据策略 | 不接受客户端作为权威值 | 按 dimension、support、retry、任务合同核验 | 游戏成功不等于学习证据 |
| `source` | Game Core 事件来源 | 不得伪装普通语言任务 | 对 route_bonus 做排除 | `route_bonus` 完全排除 E0–E3 |
| `origin` | 本地存储/同步层 | 不得把 local 改成 server | 记录来源状态 | 至少区分 `local`、`server_confirmed`、`rejected` |
| `occurredAt` | 客户端记录时间 | 可作为客户端时间，不是服务端权威时间 | 结合服务端时间审计 | 不用于学习能力或反应速度评分 |
| `acceptedAt` | 服务端 | 否 | 服务端生成 | 仅在服务端接受后存在 |
| `requestId` | API 服务端 | 否 | 服务端生成 | 错误定位和支持追踪 |
| `syncCursor` | Sync API 服务端 | 否 | 服务端生成/推进 | 不由客户端自行推进 |

## 1.1 与 OpenAPI / Event Schema 的字段对齐

机器可读合同以以下文件为准：
- `docs/contracts/openapi.v1.candidate.json`：OpenAPI 3.1 路径、请求/响应和公共 schema。
- `docs/contracts/event-contract.schema.json`：GameEvent、StudyEventIntent、ProgressEvent 的 JSON Schema。
- `docs/contracts/fixtures/api-v1-fixtures.candidate.json`：12 项预期 API/负向 fixture（不是实时 HTTP 抓包）。

客户端上传的三类事件都必须带 `origin="local"`；服务端接受结果通过独立的 EventDecision 返回，不能把客户端事件改写成 `server_confirmed`。StudyEventIntent 必须带 `evidencePolicyVersion`，不得包含客户端自报的 `verdict`、`evidenceLevel` 或 `masteryScore`。StudyEventIntent 不设 `source=route_bonus`；路线奖励只能作为 ProgressEvent/GameEvent 记录。

`## 2. 事件分层：禁止混成一个结果对象`

### 2.1 GameEvent（游戏状态事件）

候选结构：

```ts
interface GameEvent {
  eventId: string;
  sessionId: string;
  gameId: string;
  gameVersion: string;
  logicVersion: string;
  schemaVersion: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  origin: 'local' | 'server_confirmed';
}
```

用途：棋盘、路线、机关、阶段、部件、动画触发依据等。不得包含客户端自报掌握度。

### 2.2 StudyEvent（语言任务/学习证据事件）

客户端提交意图的候选结构：

```ts
interface StudyEventIntent {
  eventId: string;
  sessionId: string;
  gameId: string;
  gameVersion: string;
  logicVersion: string;
  schemaVersion: string;
  contentPackId: string;
  contentPackVersion: string;
  wordId: string;
  senseId: string;
  taskId: string;
  taskVariantId: string;
  dimension: 'meaning' | 'listening' | 'spelling' | 'morphology' | 'context';
  taskType: string;
  supportLevel: string;
  hintState: string;
  attemptIndex: number;
  answerIntent: unknown;
  source: 'player_task';
  occurredAt: string;
}
```

服务端确认结果候选结构：

```ts
interface StudyEventDecision {
  eventId: string;
  accepted: boolean;
  verdict?: 'correct' | 'incorrect' | 'invalid' | 'unsupported';
  evidenceLevel?: 'E0' | 'E1' | 'E2' | 'E3';
  acceptedAt?: string;
  requestId: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

约束：

- 客户端只提交允许的答案意图与最小上下文；不得把 `verdict`、`evidenceLevel`、总正确数、掌握度作为可信输入。
- 服务端根据 contentPackVersion、taskId、senseId、accepted variants、supportLevel、hintState 和 attemptIndex 重判。
- 本地离线可生成 provisional local result，但必须保留 `origin=local`；补传后由服务端返回接受/拒绝结果。
- `source=route_bonus` 不生成 StudyEvidence；如果只产生路线/装饰收益，应记为 GameEvent 或 ProgressEvent。
- 同一 eventId 重复提交只能得到同一接受结果，不得重复计数、重复奖励或重复写复习状态。

### 2.3 ProgressEvent（进度/奖励事件）

候选字段：`eventId`、`sessionId`、`gameId`、`progressType`、`rewardRef`、`source`、`occurredAt`。

用途：关卡完成、收藏、地图解锁、装饰、非竞争性路线奖励。永远不直接进入五维学习证据。

## 3. API v1 字段映射

| API | 请求字段候选 | 响应字段候选 | 权威边界 / 负向测试 |
|---|---|---|---|
| GET `/api/v1/health` | 无业务请求体 | `status`、`serviceVersion`、`requestId` | 不返回敏感配置；服务不可用时返回统一错误 |
| GET `/api/v1/content-packs` | 查询筛选参数（年级/课程等，具体待定） | `items[]`：`packId`、`version`、`title`、`gradeBand`、`curriculum`、`wordCount`、`contentHash`、`publishedAt` | 只返回已发布版本；不返回未审核词条 |
| GET `/api/v1/content-packs/{packId}/versions/{version}/manifest` | 路径参数 packId/version | manifest、schemaVersion、contentHash、assetManifestHash、资源引用 | 不存在版本必须明确 404；hash 不一致不得安装 |
| POST `/api/v1/activation/redeem` | 激活码与最小必要档案/设备关联信息（字段待产品决策） | 兑换结果、权益引用、有效期、requestId | 重复兑换幂等；过期/撤销/非法码不得发权益 |
| GET `/api/v1/entitlements` | 授权上下文（匿名/账号模式待定） | 当前有效权益与适用内容包 | 不能由客户端自行声明已购买 |
| POST `/api/v1/sync/batches` | 一批 GameEvent / StudyEvent / ProgressEvent 意图、eventId、版本、幂等键 | 每条事件 accepted/rejected、acceptedAt、syncCursor | 重复、乱序、旧版本、非法 sense、伪造 verdict/evidence、route_bonus 冒充学习事件 |
| GET `/api/v1/sync/changes?cursor=` | 服务端游标 | 增量变化、nextCursor、版本信息 | 无效/过期 cursor 有明确恢复路径；客户端不能跳过服务端校验 |
| POST `/api/v1/privacy/export` | 已授权的导出请求上下文 | exportJobId、状态、结果引用/过期时间 | 未授权请求拒绝；导出内容范围可审计 |
| POST `/api/v1/privacy/delete` | 已授权的删除请求上下文、目标档案/范围 | deletionJobId、状态、完成时间 | 删除需覆盖服务端、缓存、备份策略和离线待补传过滤 |

以上请求/响应字段均为候选；具体身份字段、激活码权益模型、分页方式、导出文件方式、删除范围、同步冲突策略，必须先由产品所有者确认，再形成 OpenAPI 3.1 与 Zod schema。不得把候选表写成接口已实现。

## 4. 统一错误结构

候选结构：

```ts
interface ApiError {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
}
```

- 用户可见的儿童提示由前端把 code 映射为清楚、非羞辱的短句。
- retryable=true 时按幂等策略重试；不能因为超时就生成新的 eventId。
- schema/version 不兼容不得自动降级成成功。
- 服务端日志不得记录原始键盘/触控时序或不必要的儿童个人信息。

## 5. API fixture 与负向测试计划

| 编号 | 测试 | 预期 |
|---|---|---|
| API-V1-01 | 健康检查成功/服务不可用 | 正确状态与统一错误结构 |
| API-V1-02 | 拉取内容包列表 | 只返回已发布、已审核版本 |
| API-V1-03 | manifest hash 正确/篡改/不存在 | 正确接受、拒绝或 404；不安装不完整包 |
| API-V1-04 | 激活码首次兑换/重复兑换/过期/撤销 | 幂等且权益状态正确 |
| API-V1-05 | entitlement 正常/过期/撤销 | 客户端无法伪造购买权益 |
| API-V1-06 | sync 批次重复提交同一 eventId | 不重复计数或发奖 |
| API-V1-07 | sync 提交不存在的 wordId/senseId/taskId | 拒绝，不产生学习证据 |
| API-V1-08 | 客户端伪造 verdict、evidenceLevel、掌握度 | 服务端忽略/拒绝，按权威规则重判 |
| API-V1-09 | route_bonus 混入 StudyEvent | 不进入 E0–E3 |
| API-V1-10 | 旧 contentPackVersion / logicVersion | 明确兼容、拒绝或要求升级，不静默换版本 |
| API-V1-11 | 乱序、超时、部分失败后重试 | 幂等且可追踪，不重复写入 |
| API-V1-12 | 删除后仍有离线待补传事件 | 删除过滤生效，不复活已删除数据 |

所有 fixture 必须保存原始 request/response、HTTP 状态码、requestId、服务端日志和数据库回读。当前服务端尚未实现，因此 API-V1-01 至 API-V1-12 均为【未执行】。

## 6. 尚未冻结的关键决策

1. 首发是否只使用匿名本机档案，何时引入账号/监护人关联。
2. sessionId 由客户端本地生成还是服务端分配；离线会话如何在未来同步时关联。
3. eventId 与 Idempotency-Key 的生成、作用域和保留期。
4. Sync 批次的最大事件数、体积上限、顺序规则、部分成功语义和游标过期恢复。
5. 内容包 manifest 是否内嵌任务答案规范，离线判题与服务端重判的版本策略。
6. 监护人授权、导出、删除范围和保留期限。
7. 48 小时窗口、重试和 E0–E3 的精确规则。

## 7. P0-0 关闭要求

- 字段来源、产生方、权威方、客户端可改写范围和服务端校验规则全部明确。
- GameEvent、StudyEvent、ProgressEvent 三类事件分离。
- API 请求/响应最终字段有 OpenAPI 3.1 + Zod schema。
- API-V1-01 至 API-V1-12 在真实服务端执行并保留 fixture、日志和数据库回读；未实现的接口保持未执行。
- 伪造答案、伪造证据、重复提交、旧版本、删除后补传等负向测试通过。
- P0-0 未关闭前不实现生产 API adapter，不接入旧仓库接口。

