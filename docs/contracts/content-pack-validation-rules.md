# Content Pack 导入、版本和发布校验规则

- 版本：CONTENT-VALIDATION-0.1
- 适用 schema：`docs/contracts/content-pack.schema.json`
- 适用目录：`docs/contracts/content-pack-catalog.candidate.v0.1.json`

## 1. CSV 文件规范

- 编码：UTF-8；推荐无 BOM。分隔符为英文逗号，遵循 RFC 4180。
- 含逗号、双引号或换行的字段必须用双引号包裹；字段内双引号写成两个双引号。
- 多值字段统一使用竖线 `|` 分隔，例如 `noun|verb`、`unit-01|unit-02`；不能用逗号嵌套数组。
- 空字段表示缺失，不自动补默认词义、词性、音频或来源。
- ID 在一个内容包版本内唯一；ID 不因排序、改释义或换教材单元而随意重建。
- CSV 只是导入格式；导入后统一转换为 schema 校验的 JSON 数据。

## 2. 文件和引用关系

| 文件/实体 | 关键字段 | 关联规则 |
|---|---|---|
| words | word_id、lemma、part_of_speech、sense_ids、source_ref_ids | 每个词至少一个 sense |
| senses | sense_id、word_id、gloss_zh、pronunciation_ids、example_ids | word_id 必须存在；一个 sense 只属于一个 word |
| pronunciations | pronunciation_id、sense_id、ipa、accent、audio_asset_id | 必须绑定 sense；无音频时不得生成听辨任务 |
| examples | example_id、sense_id、text_en、text_zh、grade_fit | 必须绑定 sense 并经过语法/搭配/适龄审核 |
| task_templates | task_template_id、sense_id、dimension、task_type、evidence_cap | 只引用已审核 sense；任务类型与维度必须匹配 |
| source_refs | source_ref_id、source_type、title、verification_status、rights_status | 所有正式词条、义项和素材必须可追溯 |

## 3. 语义校验规则

1. `wordCount` 必须等于 `words.length`。
2. wordId、senseId、pronunciationId、exampleId、assetId、taskTemplateId、sourceRefId 在各自集合内唯一。
3. 每个 word.senseIds 必须存在，并且对应 sense.wordId 必须等于当前 wordId。
4. 每个 sense 的 pronunciationIds、exampleIds、assetIds、sourceRefIds 必须全部存在。
5. 一个词形的多个义项必须拆分 sense；不能把 bank“银行”和“河岸”混为一个学习记录。
6. acceptedSpellings 只记录经过教研确认的合法拼写变体；不同词项不能通过变体关系合并。
7. morphology 不适用时标记 N/A；不得强制生成题目。
8. 听辨任务必须绑定已审核音频；缺音频只能降级为非听辨任务。
9. 例句无唯一答案、语法/搭配错误或超出目标年龄段时，任务不得发布。
10. 跨包共享学习进度必须使用已审核的 canonicalSenseId，并明确标记 verified；默认 pack_scoped。

## 4. 内容包版本与哈希

- packId 表示内容包身份，版本更新不改变 packId。
- 每次内容修改生成新的不可变 version；不覆盖已经发布的版本。
- `contentHash`：对内容包 JSON 使用 RFC 8785 JSON Canonicalization Scheme 规范化后做 SHA-256；计算时排除 manifest.contentHash 和 manifest.assetManifestHash 两个字段。
- `assetManifestHash`：对按 assetId 排序的资源 manifest 做 RFC 8785 规范化后 SHA-256。
- 每个 asset.sha256 对实际资源字节计算 SHA-256；下载后必须校验。
- `wordCount`、哈希、资源清单和发布版本必须由打包工具生成，不能手工编造。
- 当前 schema 负责结构校验；唯一 ID、引用完整性、wordCount、hash 和音频任务关联由导入器做二次语义校验。

## 5. 发布门

正式 published 内容包必须同时满足：
- manifest.review.status=approved，至少一名审核人及审核时间；
- 所有词条、义项、例句、任务模板均 approved；
- 所有来源 verified 且 rightsStatus=approved；
- 所有使用中的资源 licenseStatus=approved；
- 教材包的出版社、书名、版次、出版年份、ISBN、册次和单元范围完整；
- 词量、单元覆盖和词义范围经过人工核对；
- 内容 hash 和 asset manifest hash 重算一致；
- 至少通过一轮 G03/G02/G10 任务映射与无歧义检查。

## 6. 导入错误代码

| 错误代码 | 含义 | 处理 |
|---|---|---|
| CP-001 | JSON/CSV 语法或编码错误 | 修复文件格式 |
| CP-002 | 缺少必填字段 | 按模板补齐 |
| CP-003 | ID 重复 | 合并或分配稳定 ID |
| CP-004 | 词义/资源引用不存在 | 修复引用，不自动猜测 |
| CP-005 | 多义词未拆分 | 拆分 sense |
| CP-006 | 来源缺失或未核验 | 保持 draft/unverified |
| CP-007 | 版权/授权未通过 | 不允许发布 |
| CP-008 | 音频缺失却配置 listening 任务 | 删除听辨任务或补审核音频 |
| CP-009 | 内容哈希不匹配 | 重新打包并校验资源 |
| CP-010 | 版本覆盖已发布版本 | 创建新版本，不覆盖 |
| CP-011 | 任务答案存在歧义 | 教研修订任务 |
| CP-012 | 共享进度缺少已核验 canonical sense | 改为 pack_scoped |

## 7. P0-0.2 验收状态

结构 schema、CSV 表头、目录蓝图和发布门已定义；当前尚无实际导入器，未执行端到端导入测试。人教版、外研版、译林版、北师大版、冀教版均为候选出版社槽位，具体版次/ISBN/词表没有核验前不得作为正式可选包。
