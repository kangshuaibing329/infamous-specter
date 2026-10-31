import Phaser from 'phaser';
import {
  INITIAL_LAB_STATE,
  normalizeLabState,
  reduceLabState,
  type LabInputSource,
  type LabState
} from '@wordquest/game-core';

type ActiveInputSource = Exclude<LabInputSource, 'system'>;

export class T1LabScene extends Phaser.Scene {
  private state: LabState = { ...INITIAL_LAB_STATE };
  private avatar: Phaser.GameObjects.Arc | null = null;
  private stateText: Phaser.GameObjects.Text | null = null;
  private readonly onStateChange: (state: LabState) => void;

  constructor(onStateChange: (state: LabState) => void) {
    super({ key: 'T1LabScene' });
    this.onStateChange = onStateChange;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1220');
    this.add.rectangle(480, 270, 900, 440, 0x111c2d).setStrokeStyle(2, 0x334155);
    this.add.text(42, 34, 'WORDQUEST  /  T1 TECH LAB', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#67e8f9',
      fontStyle: 'bold'
    });
    this.add.text(42, 72, 'Tap / Click the stage or use arrow keys', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#cbd5e1'
    });

    this.add.circle(180, 210, 9, 0x0e7490);
    this.add.circle(780, 360, 12, 0x0e7490);
    this.add.circle(720, 170, 6, 0x38bdf8);

    this.avatar = this.add.circle(this.state.x, this.state.y, 25, 0x38bdf8)
      .setStrokeStyle(4, 0xe0f2fe);
    this.stateText = this.add.text(42, 460, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      color: '#94a3b8'
    });

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.on('keydown', this.handleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.renderState();
  }

  moveBy(dx: number, dy: number, source: ActiveInputSource = 'button') {
    this.state = reduceLabState(this.state, {
      type: 'MOVE_BY',
      dx,
      dy,
      source
    });
    this.renderState();
  }

  reset() {
    this.state = reduceLabState(this.state, { type: 'RESET' });
    this.renderState();
  }

  getSnapshot(): LabState {
    return { ...this.state };
  }

  restore(candidate: unknown) {
    const restored = normalizeLabState(candidate);
    if (!restored) throw new Error('Saved lab state is invalid.');
    this.state = restored;
    this.renderState();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    this.state = reduceLabState(this.state, {
      type: 'MOVE_TO',
      x: pointer.x,
      y: pointer.y,
      source: 'pointer'
    });
    this.renderState();
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const keyMoves: Record<string, [number, number]> = {
      ArrowUp: [0, -36],
      ArrowDown: [0, 36],
      ArrowLeft: [-36, 0],
      ArrowRight: [36, 0],
      KeyW: [0, -36],
      KeyS: [0, 36],
      KeyA: [-36, 0],
      KeyD: [36, 0]
    };
    const move = keyMoves[event.code];
    if (!move) return;
    event.preventDefault();
    this.moveBy(move[0], move[1], 'keyboard');
  };

  private renderState() {
    this.avatar?.setPosition(this.state.x, this.state.y);
    this.stateText?.setText(
      'X: ' + Math.round(this.state.x) +
      '   Y: ' + Math.round(this.state.y) +
      '   ACTIONS: ' + this.state.actionCount +
      '   INPUT: ' + this.state.lastInput.toUpperCase()
    );
    this.onStateChange(this.getSnapshot());
  }

  private cleanup() {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
  }
}