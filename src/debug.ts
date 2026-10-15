import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type { BallState, CaromState, Mode, Screen, Side } from "./game";
import { drawServeSign, initialState, obstaclePose, parkedBall } from "./world";
import { menuItemRect } from "./menus";
import type { MenuRect } from "./menus";

type State = DeepReadonly<CaromState>;
export type CaromSnapshot = Omit<CaromState, "ball" | "menuPresses"> & {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
};
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: State): CaromState;
  spawnBall(s: State): CaromState;
  spawnObstacle(s: State, index: number): CaromState;
  reset(s: State): CaromState;
  reconcile(s: State): CaromState;
  setScreen(s: State, screen: Screen): CaromState;
  setMode(s: State, mode: Mode): CaromState;
  setMenuIndex(s: State, index: number): CaromState;
  setTitleIndex(s: State, index: number): CaromState;
  setResumeScreen(s: State, screen: "playing" | "countdown"): CaromState;
  setScore(s: State, p1: number, p2: number): CaromState;
  setWinner(s: State, side: Side | null): CaromState;
  setReceiver(s: State, side: Side): CaromState;
  setPaddleCy(s: State, side: Side, cy: number): CaromState;
  setPaddleVy(s: State, side: Side, vy: number): CaromState;
  setPaddleDriven(s: State, side: Side, driven: boolean): CaromState;
  setBallPosition(s: State, x: number, y: number): CaromState;
  setBallVelocity(s: State, vx: number, vy: number): CaromState;
  setBallSpin(s: State, spin: number): CaromState;
  setBallHeld(s: State, held: boolean): CaromState;
  setBallHoldTimer(s: State, seconds: number): CaromState;
  setBallServeSign(s: State, sign: 1 | -1): CaromState;
  drawBallServeSign(s: State): CaromState;
  setAiTracking(s: State, enabled: boolean): CaromState;
  setAiMovement(s: State, enabled: boolean): CaromState;
  setMuted(s: State, muted: boolean): CaromState;
  setObstacleClock(s: State, t: number): CaromState;
  setObstacleClockRunning(s: State, running: boolean): CaromState;
  snapshot(s: State): CaromSnapshot;
  menuItemRect(s: State, index: number): MenuRect | null;
}
function ballWith(s: State, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Cannot pose an absent ball");
  return { ...s, ball: { ...s.ball, ...patch } };
}
export function createDebug(): CaromDebugApi {
  return {
    version: C.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...s, ball: parkedBall() }),
    spawnObstacle: (s, index) => ({
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        obstaclePose(index, s.obstacleClock),
      ].sort((a, b) => a.index - b.index),
    }),
    reset: (s) => initialState(s.muted),
    reconcile: (s) => ({
      ...s,
      obstacles: s.obstacles.map((o) => obstaclePose(o.index, s.obstacleClock)),
    }),
    setScreen: (s, screen) => ({ ...s, screen }),
    setMode: (s, mode) => ({ ...s, mode }),
    setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
    setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...s, winner }),
    setReceiver: (s, receiver) => ({ ...s, receiver }),
    setPaddleCy: (s, side, cy) => ({
      ...s,
      paddles: { ...s.paddles, [side]: { ...s.paddles[side], cy } },
    }),
    setPaddleVy: (s, side, drivenVy) => ({
      ...s,
      paddles: { ...s.paddles, [side]: { ...s.paddles[side], drivenVy } },
    }),
    setPaddleDriven: (s, side, driven) => ({
      ...s,
      paddles: { ...s.paddles, [side]: { ...s.paddles[side], driven } },
    }),
    setBallPosition: (s, x, y) => ballWith(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ballWith(s, { vx, vy }),
    setBallSpin: (s, spin) => ballWith(s, { spin }),
    setBallHeld: (s, held) => ballWith(s, { held }),
    setBallHoldTimer: (s, holdTimer) => ballWith(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => ballWith(s, { serveSign }),
    drawBallServeSign: (s) => {
      if (!s.ball) throw new Error("Cannot pose an absent ball");
      return ballWith(s, { serveSign: drawServeSign() });
    },
    setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...s, muted }),
    setObstacleClock: (s, obstacleClock) => ({
      ...s,
      obstacleClock,
      obstacles: s.obstacles.map((o) => obstaclePose(o.index, obstacleClock)),
    }),
    setObstacleClockRunning: (s, obstacleClockRunning) => ({
      ...s,
      obstacleClockRunning,
    }),
    snapshot: (s) => ({
      version: C.CAROM_DEBUG_VERSION,
      screen: s.screen,
      mode: s.mode,
      menuIndex: s.menuIndex,
      titleIndex: s.titleIndex,
      resumeScreen: s.resumeScreen,
      score: { ...s.score },
      winner: s.winner,
      muted: s.muted,
      paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
      ai: { ...s.ai },
      receiver: s.receiver,
      ball: s.ball
        ? {
            ...s.ball,
            speed: Math.hypot(s.ball.vx, s.ball.vy),
            trail: s.ball.trail.map((p) => ({ ...p })),
          }
        : null,
      obstacles: s.obstacles.map((o) => obstaclePose(o.index, s.obstacleClock)),
      obstacleClock: s.obstacleClock,
      obstacleClockRunning: s.obstacleClockRunning,
      simTime: s.simTime,
    }),
    menuItemRect,
  };
}
