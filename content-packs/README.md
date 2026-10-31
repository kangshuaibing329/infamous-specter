# WordQuest｜首批通用词包索引

- 词库数据版本：0.1.0
- 状态：preview / in_review；不属于正式发布词包
- 目标：先用三套主题明确、可供多款游戏消费的内容包打通内容链路。

| packId | 名称 | 系列 | 词条数 | 任务模板 | CSV |
|---|---|---|---:|---:|---|
| high-frequency-starter | 基础高频词汇·试用版 | 高频核心 | 30 | 92 | words / senses / pronunciations / examples / task-templates |
| theme-school-life | 校园生活词汇·试用版 | 主题场景 | 30 | 93 | words / senses / pronunciations / examples / task-templates |
| theme-nature-science | 自然与科学词汇·试用版 | 主题场景 | 31 | 95 | words / senses / pronunciations / examples / task-templates |

## 客户选择逻辑

客户可从高频核心版选择“基础高频词汇·试用版”，或从主题场景版选择“校园生活词汇·试用版”“自然与科学词汇·试用版”。选择器必须显示“预览版/待审核”，不得伪装为正式课程包。

每次会话固定 packId + version。默认进度隔离，不能因切换词包覆盖另一包的记录。

## 文件结构

每个 pack 目录同时提供：
- `pack.json`：统一 Content Pack JSON，可作为导入器的标准输入。
- `words.csv`
- `senses.csv`
- `pronunciations.csv`
- `examples.csv`
- `task-templates.csv`

辅助合同：
- `answer-specs.v1.json`
- `support-policies.v1.json`
- `morphology-rules.v1.json`

CSV 的多值字段使用竖线 `|` 分隔；单元格仍按 RFC 4180 规则转义。导入时先校验 JSON Schema 和引用完整性，不得直接把 CSV 上传成功等同于内容审核通过。

## 游戏适配边界

| 游戏 | 当前可用维度 | 备注 |
|---|---|---|
| G01 词岛大冒险 | meaning | 需运行时构造无歧义选择项 |
| G02 拼写矿车 | spelling | 只接受审核通过的拼写变体 |
| G03 词语连连看 | meaning | 按 sense 配对 |
| G04 词块消消乐 | meaning | 语言判定先于消除 |
| G05 音速滑板 | 暂不可用 | 无已批准音频资源 |
| G06 变形工厂 | morphology（少量） | 规则和词条均待教研审核 |
| G07 句桥救援 | context | 每题必须唯一答案 |
| G08 易混词侦探城 | 暂不可用 | 尚无审核通过的易混词组 |
| G09 线索地牢 | context | 需要唯一可推断候选 |
| G10 岛心巨像 | meaning / spelling / context | 综合挑战运行时未实现 |

## 内容质量状态

所有词条、义项、发音、例句、任务均为 draft；来源 unverified、rights pending_review。IPA 为美音口径草稿，不是已核验发音数据。当前没有音频资产，听辨维度明确关闭。

在教研、词典核验、授权审查和运行时导入器验收完成前，禁止把 pack 状态改成 published。
