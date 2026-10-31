# WordQuest｜通用词包索引

- 当前扩充候选版本：0.2.0
- 历史样本版本：0.1.0（保留，不覆盖）
- 状态：preview / in_review；不代表正式审核或可售内容
- 当前范围：高频核心版 + 两套主题场景版，覆盖多款游戏的内容数据结构。

| packId | 名称 | 系列 | 当前候选版本 | 词条数 | 任务模板 |
|---|---|---|---|---:|---:|
| high-frequency-starter | 基础高频词汇·试用版 | 高频核心 | 0.2.0 | 110 | 340 |
| theme-school-life | 校园生活词汇·试用版 | 主题场景 | 0.2.0 | 104 | 327 |
| theme-nature-science | 自然与科学词汇·试用版 | 主题场景 | 0.2.0 | 103 | 318 |
| **合计** |  |  |  | **317** | **985** |

## 客户选择逻辑

目录层可识别三个 packId；会话开始时必须固定 packId + version。选择器必须显示“预览版/待审核”，不得伪装为正式课程包。版本升级不得覆盖已经发布的历史版本。

## 文件结构

每个版本目录包含：
- `pack.json`：统一 Content Pack JSON。
- `words.csv`
- `senses.csv`
- `pronunciations.csv`
- `examples.csv`
- `task-templates.csv`

辅助合同和生产文件：
- `answer-specs.v1.json`
- `support-policies.v1.json`
- `morphology-rules.v1.json`
- `confusable-sets.v1.json`
- `audio-production-manifest.v0.2.0.csv`
- `AUDIO-PRODUCTION-SPEC.md`
- `CONTENT-QA-MATRIX-v0.2.0.md`

CSV 的多值字段使用竖线 `|` 分隔；单元格按 RFC 4180 规则转义。导入时先校验 JSON Schema、重复项和引用完整性，不得直接把 CSV 上传成功等同于内容审核通过。

## 游戏适配边界

| 游戏 | 当前数据覆盖 | 发布边界 |
|---|---|---|
| G01 词岛大冒险 | meaning | 选择项必须无歧义 |
| G02 拼写矿车 | spelling | 只接受审核通过的拼写变体 |
| G03 词语连连看 | meaning | 按 sense 配对 |
| G04 词块消消乐 | meaning | 语言判定先于消除 |
| G05 音速滑板 | 未开放 | 317 条音频仅有生产清单，音频未生成 |
| G06 变形工厂 | 少量 morphology | 复合词和词缀规则均为 draft，需审核 |
| G07 句桥救援 | context | 每题必须唯一答案 |
| G08 易混词侦探城 | 9 组候选辨析 | 18 个对比任务为 draft，教师审核前不得启用 |
| G09 线索地牢 | context | 需要唯一可推断候选 |
| G10 岛心巨像 | meaning / spelling / context | 综合挑战运行时尚未验收 |

## 内容质量状态

所有词条、义项、发音、例句和任务均为 draft；来源 unverified、rights pending_review。IPA 为美音口径编辑草稿，不是已核验发音数据。音频生产清单不等于音频资产，当前 G05 必须关闭。

易混词组和构词任务已建立候选数据，但尚未通过英语教师审核。所有游戏映射只表示数据适配方向，不表示运行时功能已经完成。

在教研、词典核验、授权审查、正式导入器和运行时验收完成前，禁止把 pack 状态改成 published。

## 验收记录

- [0.2.0 扩充与静态验收报告](../docs/acceptance/P0-1-词库扩充0.2.0静态验收报告.md)
- [0.1.0 首批词包记录](../docs/acceptance/P0-1-首批通用词包交付与静态验收报告.md)

## 第一轮内容编辑审查

- [317 词条第一轮内容编辑审查报告](../docs/acceptance/P0-1-317词条第一轮内容编辑审查报告.md)
- [美式英语与发音核验记录](review/0.2.0/PRONUNCIATION-AND-US-ENGLISH-CHECKS.md)

第一轮 AI 辅助内容编辑审查已覆盖 317/317 词条；教师复核、剩余 IPA 核验、音频、版权、生产导入器和游戏运行时验收仍未完成。三套词包保持 preview / in_review，不得发布。
