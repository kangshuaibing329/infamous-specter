import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { LabState } from '@wordquest/game-core';
import { T1LabScene } from '../game/T1LabScene';

interface PhaserLabProps {
  onReady: (scene: T1LabScene) => void;
  onDispose: (scene: T1LabScene) => void;
  onStateChange: (state: LabState) => void;
  onError: (message: string) => void;
}

export function PhaserLab({ onReady, onDispose, onStateChange, onError }: PhaserLabProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let game: Phaser.Game | null = null;
    const scene = new T1LabScene(onStateChange);

    try {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 960,
        height: 540,
        parent: host,
        backgroundColor: '#0b1220',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        input: { activePointers: 2 },
        scene: [scene]
      });
      onReady(scene);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }

    return () => {
      onDispose(scene);
      game?.destroy(true);
      game = null;
    };
  }, [onDispose, onError, onReady, onStateChange]);

  return (
    <div
      ref={hostRef}
      className="phaser-host"
      role="img"
      aria-label="Phaser 技术样板画布；可使用下方方向按钮或键盘完成相同操作。"
    />
  );
}