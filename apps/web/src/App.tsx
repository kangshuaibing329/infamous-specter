import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_LAB_STATE,
  type LabInputSource,
  type LabState
} from '@wordquest/game-core';
import { loadLabState, saveLabState } from '@wordquest/storage';
import type { T1LabScene } from './game/T1LabScene';
import { P1LearningLab } from './components/P1LearningLab';

const PhaserLab = lazy(() =>
  import('./components/PhaserLab').then((module) => ({
    default: module.PhaserLab
  }))
);

const inputLabels: Record<LabInputSource, string> = {
  system: '系统初始化',
  pointer: '触控 / 鼠标',
  keyboard: '键盘',
  button: '页面按钮'
};

export function App() {
  const sceneRef = useRef<T1LabScene | null>(null);
  const [labState, setLabState] = useState<LabState>(INITIAL_LAB_STATE);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('正在加载游戏容器……');
  const [networkStatus, setNetworkStatus] = useState(
    () => (navigator.onLine ? '在线' : '离线')
  );

  const handleSceneReady = useCallback((scene: T1LabScene) => {
    sceneRef.current = scene;
    void loadLabState()
      .then((savedState) => {
        if (savedState) {
          scene.restore(savedState);
          setStatus('已读取本机保存的进度。');
        } else {
          setStatus('技术样板已就绪，可以开始操作。');
        }
      })
      .catch(() => {
        setStatus('游戏已就绪，但本机存储暂不可用。');
      })
      .finally(() => setIsReady(true));
  }, []);

  const handleSceneDispose = useCallback((scene: T1LabScene) => {
    if (sceneRef.current === scene) {
      sceneRef.current = null;
      setIsReady(false);
    }
  }, []);

  const handleSceneError = useCallback((message: string) => {
    setStatus('游戏容器启动失败：' + message);
  }, []);

  const handleMove = useCallback((dx: number, dy: number) => {
    sceneRef.current?.moveBy(dx, dy, 'button');
  }, []);

  const handleSave = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) {
      setStatus('游戏容器尚未就绪，暂时不能保存。');
      return;
    }
    try {
      const record = await saveLabState(scene.getSnapshot());
      setStatus('进度已保存到本机：' + new Date(record.savedAt).toLocaleTimeString());
    } catch {
      setStatus('保存失败。请检查浏览器是否允许本站使用本地存储。');
    }
  }, []);

  const handleRestore = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) {
      setStatus('游戏容器尚未就绪，暂时不能恢复。');
      return;
    }
    try {
      const savedState = await loadLabState();
      if (!savedState) {
        setStatus('当前设备没有找到已保存的进度。');
        return;
      }
      scene.restore(savedState);
      setStatus('已从本机存档恢复进度。');
    } catch {
      setStatus('读取本机存档失败。');
    }
  }, []);

  const handleReset = useCallback(() => {
    sceneRef.current?.reset();
    setStatus('位置已重置；之前保存的存档不会自动覆盖。');
  }, []);

  useEffect(() => {
    const updateNetwork = () => setNetworkStatus(navigator.onLine ? '在线' : '离线');
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WORDQUEST / ENGINEERING SPIKE</p>
          <h1>WordQuest 技术与学习核心验收台</h1>
          <p className="subtitle">
            验证词库、Learning Core、Session Adapter，以及 React、Phaser、本机存档和 PWA 技术底座；不代表正式游戏已完成。
          </p>
        </div>
        <div className="status-stack">
          <span className={isReady ? 'status-pill ready' : 'status-pill'}>
            {isReady ? '游戏容器已启动' : '游戏容器加载中'}
          </span>
          <span className="status-pill">网络：{networkStatus}</span>
        </div>
      </header>

      <P1LearningLab />

      <div className="content-grid">
        <section className="panel game-panel" aria-labelledby="stage-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">INTERACTIVE STAGE</p>
              <h2 id="stage-title">跨端输入样板</h2>
            </div>
            <span className="small-tag">960 × 540 · FIT</span>
          </div>

          <Suspense fallback={<div className="loading-stage">正在加载 Phaser 模块……</div>}>
            <PhaserLab
              onReady={handleSceneReady}
              onDispose={handleSceneDispose}
              onStateChange={setLabState}
              onError={handleSceneError}
            />
          </Suspense>

          <div className="metrics-row">
            <div className="metric">
              <span>当前坐标</span>
              <strong data-testid="lab-position">
                X: {Math.round(labState.x)} / Y: {Math.round(labState.y)}
              </strong>
            </div>
            <div className="metric">
              <span>有效操作</span>
              <strong data-testid="lab-action-count">{labState.actionCount}</strong>
            </div>
            <div className="metric">
              <span>最近输入</span>
              <strong>{inputLabels[labState.lastInput]}</strong>
            </div>
          </div>
        </section>

        <aside className="panel controls-panel" aria-labelledby="controls-title">
          <p className="eyebrow">CONTROL & STORAGE</p>
          <h2 id="controls-title">操作与存档</h2>
          <p className="panel-copy">
            点击画布、使用方向键，或使用下面的按钮移动圆点。三种入口会进入同一个规则状态。
          </p>

          <div className="direction-pad" aria-label="方向控制">
            <span />
            <button type="button" onClick={() => handleMove(0, -36)} disabled={!isReady}>向上移动</button>
            <span />
            <button type="button" onClick={() => handleMove(-36, 0)} disabled={!isReady}>向左移动</button>
            <button type="button" className="center-control" onClick={handleReset} disabled={!isReady}>重置位置</button>
            <button type="button" onClick={() => handleMove(36, 0)} disabled={!isReady}>向右移动</button>
            <span />
            <button type="button" onClick={() => handleMove(0, 36)} disabled={!isReady}>向下移动</button>
            <span />
          </div>

          <div className="storage-actions">
            <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={!isReady}>保存进度</button>
            <button type="button" className="secondary-button" onClick={() => void handleRestore()} disabled={!isReady}>恢复进度</button>
          </div>

          <div className="status-message" role="status" aria-live="polite">{status}</div>

          <div className="acceptance-note">
            <strong>当前验证边界</strong>
            <ul>
              <li>游戏状态保存在浏览器 IndexedDB。</li>
              <li>本机存档不等于跨设备云同步。</li>
              <li>离线验证通过前，不承诺断网可用。</li>
              <li>键盘按钮是画布交互的 DOM 替代入口。</li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="footer-note">
        T1 技术样板 · 不含正式词库、账号、支付、云端 API 或十款游戏内容。
      </footer>
    </main>
  );
}