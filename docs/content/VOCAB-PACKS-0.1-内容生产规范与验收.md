# 方向一｜首批三套词库内容生产与验收规范

- 版本：VOCAB-PACKS-0.1.0
- 仓库：kangshuaibing329/infamous-specter
- 分支：codex/vocabulary-packs-v0.1
- 当前定位：首轮可导入样本包 / 内部教研审查
- 不是：正式教材词表、已完成音频包、已获版权审查的商业发布包

## 1. 本轮交付范围

本轮先建立三套通用词库，每套 30 个词条，共 90 个词条。每个词条拆分为独立 wordId 和 senseId，并提供一条原创例句、中文译文和一条美式 IPA 候选记录。

| packId | 名称 | 年级建议 | 词条数 | 当前状态 |
|---|---|---|---:|---|
| high-frequency-starter | 基础高频词汇·入门篇 | 四至六年级 | 30 | preview / 内部审查 |
| theme-school-life | 校园生活词汇·场景篇 | 五至七年级 | 30 | preview / 内部审查 |
| theme-nature-science | 自然与科学词汇·探索篇 | 六至八年级 | 30 | preview / 内部审查 |

所有包均使用独立 packId，版本 0.1.0，进度范围 pack_scoped。不得将三个包合并成同一份无来源的混合词表。

## 2. 文件结构

每个包均提供：
- `content-pack.json`：主交付文件，遵循 `docs/contracts/content-pack.schema.json`。
- `words.csv`：词形和词条主表。
- `senses.csv`：义项表。
- `pronunciations.csv`：音标/口音/音频状态表。
- `examples.csv`：原创例句与中文翻译。
- `task-templates.csv`：五维任务模板映射。

目录示例：
```
content-packs/
  high-frequency-starter/0.1.0/
  theme-school-life/0.1.0/
  theme-nature-science/0.1.0/
```

JSON 是规范主数据；CSV 是便于教研人员编辑和导入的扁平化视图。修改 CSV 后必须通过导入器重新生成 JSON、ID/引用校验、wordCount 和 SHA-256，不得只改 CSV 而让 JSON 保持旧内容。

## 3. 词条内容规则

1. 一个 word 表示词形，一个 sense 表示一个具体词义；同形多义词必须拆分 sense。
2. 每条 sense 至少有明确中文释义、一个例句、对应发音候选记录和来源引用。
3. 例句优先采用短句、明确语境和适龄词汇；避免为凑数量写出多义、语法不自然或答案不唯一的句子。
4. 每条词条必须标记建议年级、所属单元、词性和主题标签。
5. 不把未核实的出版社教材范围写成“同步版”“全册覆盖”。
6. 不从商业词典、教材或其他受版权保护的词表批量复制释义/例句。正式版本需要记录可核验来源和许可。
7. IPA 目前是编辑候选值，必须由合格英语教研人员复核音标、重音、音节和口音一致性。

## 4. 五维映射规则

五维：meaning、listening、spelling、morphology、context。

当前样本包的任务映射如下：
- meaning：meaning_retrieval，目标为无选项、无提示的主动提取。
- spelling：spelling_production，目标为独立拼写输入。
- context：context_completion，目标为结合句意完成语境任务。
- listening：暂不生成任务。虽然提供 IPA 候选记录，但尚无审核通过的音频资产；无音频不得假装具备听辨能力。
- morphology：本轮样本统一标记 N/A。未建立并审核具体构词/屈折规则前，不生成 morphology 任务，避免将“词性是名词/动词/形容词”误当成可教的构词规则。

任务模板的 E2 只是模板允许的最高证据上限候选；真实 E0–E3 必须由 Learning Core 根据首次有效回答、认知支持、跨游戏/跨 taskType 和延迟窗口计算，客户端不得自行赋值。

## 5. 内容质量和发布状态

当前三套包的状态是 `preview`，但 `customerSelectable=false`。词条、义项、例句、发音均为 draft；sourceRef 为 unverified，rightsStatus 为 pending_review。

进入正式发布至少需要：
- 英语教研人员逐条复核词义、词性、搭配、例句、中文译文和年级适配；
- 逐条复核 IPA 与口音；有听辨任务时必须有已授权且已审核的音频文件；
- 来源引用可核验，素材许可明确；
- 补齐适用的构词规则和规则测试；
- 对 CSV 导入、Schema、唯一 ID、引用完整性和哈希进行工具化验证；
- 由审核人和审核时间签字后，才可把内容状态升级为 approved/published。

不能因为文件存在、JSON 能解析或 hash 正确，就宣称内容教研审核通过。

## 6. 本轮静态检查结果

| 检查项 | 结果 |
|---|---:|
| 词库包 | 3 |
| 单词词条 | 90 |
| 独立义项 | 90 |
| 原创例句 | 90 |
| IPA 候选记录 | 90 |
| 任务模板 | 270 |
| 每包 CSV 文件 | 5 |
| 每包音频资源 | 0 |
| 每包已审核状态 | 尚未审核 |

已对三套 JSON 主文件执行只读结构校验（覆盖当前 schema 使用的 type、required、additionalProperties、enum、const、pattern、数组长度/唯一性及发布条件）：三套均为 0 项结构错误；词条/义项/任务外键检查均为 0 项错误；wordCount 均与 words 数量一致。每包 CSV 行数核对为 words/senses/pronunciations/examples 各 30 行、task-templates 各 90 行。该校验是本轮自定义结构检查，不是独立 JSON Schema 2020-12 验证器，也不是正式 CSV 导入器或教研人工验收。

## 7. 后续验收清单

- [ ] 教研逐条核对 90 个词条的释义、词性和年级适配
- [ ] 复核 90 条 IPA 与美式口音一致性
- [ ] 复核 90 条例句自然度、语法、搭配和翻译
- [ ] 补充听力音频并核对授权后，再启用 listening
- [ ] 选取确实适合的词条建立 morphology 规则，不强制覆盖所有词
- [ ] 编写并运行 JSON Schema 2020-12 验证器
- [ ] 编写 CSV → JSON 导入器和错误报告
- [ ] 校验全部外键、唯一 ID、wordCount、canonical JSON SHA-256
- [ ] 对接游戏任务前，逐个 taskTemplate 做答案规格和游戏兼容性测试
- [ ] 审核完成后更新 catalog，只有 published 包进入客户正式选择器

## 8. 重要边界

当前三套词库是可供开发/教研流程继续加工的 0.1.0 样本，不是最终售卖版本。方向一的内容框架和样本文件已形成；正式客户开放仍以教研、发音、版权和导入器验收为前置条件。
