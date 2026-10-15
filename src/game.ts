import type { Game } from "@clockwyrks/simple-2d";
import "./canvas.css";
import * as C from "./constants";
import { createDebug } from "./debug";
import { readControls } from "./menus";
import { advanceWorld, initialState } from "./world";
import { drawGame } from "./presentation";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
  /** Transient input provenance, discarded whenever the menu changes. */
  readonly menuPresses?: readonly {
    readonly id: number;
    readonly index: number;
  }[];
}

export type { CaromDebugApi, CaromSnapshot } from "./debug";
import type { CaromDebugApi } from "./debug";
export { BACKGROUND } from "./palette";

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api) {
    for (const name of C.ACTIONS)
      api.input.register(name, { keys: [...C.BINDINGS[name]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "triangle",
      freq: 680,
      freqTo: 300,
      durationMs: 75,
      gain: 0.18,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "sine",
      freq: 320,
      freqTo: 190,
      durationMs: 45,
      gain: 0.13,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "triangle",
      freq: 1100,
      freqTo: 580,
      durationMs: 95,
      gain: 0.14,
    });
    api.audio.define(C.CUES.score, {
      wave: "sine",
      freq: 440,
      freqTo: 880,
      durationMs: 240,
      gain: 0.2,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("p1 score", (s) => s.score.p1);
    api.diagnostics.register("p2 score", (s) => s.score.p2);
    api.diagnostics.register("ball position", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "absent",
    );
    api.diagnostics.register("ball velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "absent",
    );
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "absent",
    );
    api.diagnostics.register("ball spin", (s) => s.ball?.spin ?? "absent");
    for (const side of ["left", "right"] as const) {
      api.diagnostics.register(`${side} cy`, (s) => s.paddles[side].cy);
      api.diagnostics.register(`${side} vy`, (s) => s.paddles[side].vy);
    }
    return [initialState(false), createDebug()];
  },
  update(state, api, dt) {
    api.audio.setMuted(state.muted);
    const next = readControls(state, api);
    return advanceWorld(
      { ...next, muted: api.audio.muted(), simTime: state.simTime + dt },
      api,
      dt,
    );
  },
  render: drawGame,
};
