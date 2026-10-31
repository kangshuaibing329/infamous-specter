import { useEffect, useMemo, useState } from 'react';
import type { CognitiveSupport } from '@wordquest/contracts';
import { validateContentPack, type ContentPack } from '@wordquest/content';
import { createStudyEventIntent, evaluateAnswer } from '@wordquest/learning-core';
import { advanceSession, getCurrentTask, startSession, type ActiveSession } from '@wordquest/session-adapter';
import { appendStudyEvent, installContentPack, saveSession } from '@wordquest/storage';
import starterPack from '../../../../content-packs/high-frequency-starter/0.1.0/content-pack.json';
import schoolPack from '../../../../content-packs/theme-school-life/0.1.0/content-pack.json';
import naturePack from '../../../../content-packs/theme-nature-science/0.1.0/content-pack.json';

const packs = [starterPack, schoolPack, naturePack] as unknown as ContentPack[];
const packLabels: Record<string, string> = {
  'high-frequency-starter': '基础高频词汇·入门篇',
  'theme-school-life': '校园生活词汇·场景篇',
  'theme-nature-science': '自然与科学词汇·探索篇'
};

export function P1LearningLab() {
  const [selectedPackId, setSelectedPackId] = useState(packs[0].manifest.packId);
  const [validationMessage, setValidationMessage] = useState('正在检查词库结构与内容引用……');
  const [isValid, setIsValid] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [attemptIndex, setAttemptIndex] = useState(1);
  const [support, setSupport] = useState<CognitiveSupport>('none');
  const [feedback, setFeedback] = useState('先选择词库，再开始一轮本地核心验证。');
  const [lastEvidence, setLastEvidence] = useState<string>('尚无');
  const [savedEvents, setSavedEvents] = useState(0);

  const selectedPack = useMemo(() => packs.find((pack) => pack.manifest.packId === selectedPackId) ?? packs[0], [selectedPackId]);

  useEffect(() => {
    let cancelled = false;
    setIsValid(false);
    setValidationMessage('正在检查词库结构与内容引用……');
    void validateContentPack(selectedPack).then((result) => {
      if (cancelled) return;
      setIsValid(result.valid);
      setValidationMessage(result.valid
        ? `结构与引用检查通过：${selectedPack.words.length} 个词条、${selectedPack.taskTemplates.length} 个任务模板。此包仍是内部预览稿。`
        : `词库校验失败：${result.issues.slice(0, 3).map((issue) => issue.message).join('；')}`);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setValidationMessage('词库校验失败：' + (error instanceof Error ? error.message : String(error)));
    });
    return () => { cancelled = true; };
  }, [selectedPack]);

  const currentTask = activeSession ? getCurrentTask(activeSession) : null;
  const currentWord = currentTask ? selectedPack.words.find((word) => word.wordId === currentTask.wordId) : undefined;

  async function handleStart() {
    if (!isValid) {
      setFeedback('词库尚未通过结构检查，不能启动会话。');
      return;
    }
    try {
      await installContentPack(selectedPack);
      const session = await startSession({
        pack: selectedPack, profileId: 'local-preview-profile',
        gameId: 'g01-island-exploration', gameVersion: '0.1.0', logicVersion: '0.1.0',
        seed: 'wordquest-p1-seed-01', startedAt: new Date().toISOString(),
        allowInternalPreview: true, sessionId: crypto.randomUUID()
      });
      await saveSession(session.descriptor);
      setActiveSession(session);
      setAnswer('');
      setAttemptIndex(1);
      setSupport('none');
      setLastEvidence('尚无');
      setFeedback('本地样板会话已启动。当前模拟 G01 的任务输入接口，不代表 G01 正式玩法完成。');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSubmit() {
    if (!activeSession || !currentTask || !answer.trim()) {
      setFeedback('请先输入答案。');
      return;
    }
    const evaluation = evaluateAnswer({
      answer, acceptedAnswers: currentTask.acceptedAnswers, attemptIndex,
      cognitiveSupport: support, taskEvidenceCap: currentTask.evidenceCap
    });
    const event = createStudyEventIntent({
      ids: { eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() },
      session: {
        sessionId: activeSession.descriptor.sessionId, gameId: activeSession.descriptor.gameId,
        gameVersion: activeSession.descriptor.gameVersion, logicVersion: activeSession.descriptor.logicVersion
      },
      pack: { packId: activeSession.descriptor.packId, version: activeSession.descriptor.packVersion },
      task: currentTask, answerIntent: answer, attemptIndex, cognitiveSupport: support,
      evidencePolicyVersion: '1.0.0-candidate'
    });
    try {
      const writeResult = await appendStudyEvent(event, activeSession.descriptor.profileId);
      if (writeResult === 'accepted') setSavedEvents((count) => count + 1);
      if (evaluation.correct) {
        setLastEvidence(evaluation.evidenceLevel ? `${evaluation.evidenceLevel}（本机暂定）` : '无');
        const next = advanceSession(activeSession);
        await saveSession(next.descriptor);
        setActiveSession(next);
        setAnswer('');
        setAttemptIndex(1);
        setSupport('none');
        setFeedback(next.descriptor.status === 'completed'
          ? '本轮任务已完成。学习事件保存在本机，尚未经过服务端确认。'
          : `回答正确，当前任务证据上限：${evaluation.evidenceLevel ?? '无'}。已进入下一题。`);
      } else {
        setAttemptIndex((value) => value + 1);
        setLastEvidence('无正向证据');
        setFeedback(evaluation.feedbackCode === 'technical_input_error'
          ? '输入发生技术错误，不消耗有效尝试。'
          : '答案暂不匹配，可以再试一次。答错后的重试即使答对，证据最高为 E1。');
      }
    } catch (error) {
      setFeedback('本机保存失败，未确认事件写入：' + (error instanceof Error ? error.message : String(error)));
    }
  }

  function revealAnswer() {
    if (!currentTask?.acceptedAnswers[0]) return;
    setAnswer(currentTask.acceptedAnswers[0]);
    setSupport('answer_revealed');
    setFeedback('答案已显示。提交后只记 E0，不记为独立提取。');
  }

  return (
    <section className="p1-lab panel" aria-labelledby="p1-lab-title">
      <div className="p1-lab-heading">
        <div>
          <p className="eyebrow">P1 / LOCAL LEARNING CORE</p>
          <h2 id="p1-lab-title">词库与学习核心验收台</h2>
          <p className="panel-copy">只用于验证内容包、Session Adapter、答案判定和本机事件保存；不是正式游戏或客户学习报告。</p>
        </div>
        <span className="small-tag">INTERNAL PREVIEW</span>
      </div>
      <div className="p1-grid">
        <div className="p1-controls">
          <label htmlFor="pack-select">选择词库</label>
          <select id="pack-select" value={selectedPackId} onChange={(event) => {
            setSelectedPackId(event.target.value); setActiveSession(null); setAnswer('');
          }}>
            {packs.map((pack) => <option key={pack.manifest.packId} value={pack.manifest.packId}>{packLabels[pack.manifest.packId]}</option>)}
          </select>
          <div className="p1-pack-meta">
            <strong>{selectedPack.manifest.title}</strong>
            <span>版本 {selectedPack.manifest.version} · {selectedPack.words.length} 词 · pack_scoped</span>
            <span>状态：内部预览，禁止客户正式选择</span>
          </div>
          <p className={isValid ? 'p1-validation ok' : 'p1-validation'} role="status">{validationMessage}</p>
          <button type="button" className="primary-button" onClick={() => void handleStart()} disabled={!isValid}>开始本地验证会话</button>
        </div>
        <div className="p1-task">
          <div className="p1-task-topline"><span>任务输入模拟</span><span>{activeSession ? `${activeSession.descriptor.currentTaskIndex + (currentTask ? 1 : 0)} / ${activeSession.tasks.length}` : '未开始'}</span></div>
          {currentTask && currentWord ? (
            <>
              <span className="p1-dimension">{currentTask.dimension} · {currentTask.taskType}</span>
              <h3>{currentWord.lemma}</h3>
              <label htmlFor="answer-input">请输入中文释义</label>
              <input id="answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleSubmit(); }} placeholder="输入你认为正确的释义" />
              <div className="p1-actions">
                <button type="button" className="primary-button" onClick={() => void handleSubmit()}>提交答案</button>
                <button type="button" className="secondary-button" onClick={revealAnswer}>显示答案</button>
              </div>
            </>
          ) : <div className="p1-empty">{activeSession?.descriptor.status === 'completed' ? '本轮任务已完成' : '开始会话后，这里会显示当前词汇任务。'}</div>}
          <p className="p1-feedback" role="status" aria-live="polite">{feedback}</p>
        </div>
      </div>
      <div className="p1-stats">
        <div><span>本机保存事件</span><strong data-testid="p1-event-count">{savedEvents}</strong></div>
        <div><span>最近证据</span><strong data-testid="p1-last-evidence">{lastEvidence}</strong></div>
        <div><span>当前存储</span><strong>IndexedDB / local</strong></div>
      </div>
      <p className="p1-disclaimer">E0–E2 显示为本机暂定结果，不是服务端确认；本样板不生成 E3。当前没有听力音频，listening 不可用；morphology 需先审核构词规则。</p>
    </section>
  );
}
