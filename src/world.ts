import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type {
  BallState,
  CaromState,
  Mode,
  ObstacleState,
  PaddleState,
  Side,
} from "./game";
import { flyBall } from "./physics";
import { clamp } from "./math";
export const drawServeSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
export function parkedBall(): BallState {
  return {
    x: C.FIELD_CX,
    y: C.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: C.HOLD_TIME,
    serveSign: drawServeSign(),
    trail: [],
  };
}
export function obstaclePose(index: number, t: number): ObstacleState {
  const base = C.OBSTACLE_CENTERS[index];
  if (!base || !Number.isInteger(index))
    throw new RangeError(`Unknown obstacle ${index}`);
  return {
    index,
    cx: base.x,
    cy:
      base.y +
      (index === 0 ? 1 : -1) *
        C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD),
    theta: C.OBSTACLE_SPIN_RATE * t,
  };
}
export function initialState(muted: boolean): CaromState {
  const paddle: PaddleState = {
    cy: C.FIELD_CY,
    vy: 0,
    driven: false,
    drivenVy: 0,
  };
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: { ...paddle }, right: { ...paddle } },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: C.OBSTACLE_CENTERS.map((_, i) => obstaclePose(i, 0)),
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime: 0,
    muted,
  };
}
export function startMatch(
  s: DeepReadonly<CaromState>,
  mode: Mode,
): CaromState {
  return {
    ...s,
    mode,
    screen: "countdown",
    resumeScreen: "playing",
    menuIndex: 0,
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parkedBall(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
    obstacleClock: 0,
    obstacleClockRunning: true,
    obstacles: s.obstacles.map((o) => obstaclePose(o.index, 0)),
  };
}
export function returnToTitle(s: DeepReadonly<CaromState>): CaromState {
  return {
    ...initialState(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function integratePaddle(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const raw = p.cy + vy * dt;
  const cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: cy !== raw && dt > 0 ? (cy - p.cy) / dt : vy };
}
function movePaddles(
  s: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState["paddles"] {
  const held = (name: C.ActionName): boolean => api.input.value(name) > 0;
  const solo = s.mode === "solo";
  const leftVy =
    (Number(held("p1-down") || (solo && held("p2-down"))) -
      Number(held("p1-up") || (solo && held("p2-up")))) *
    C.PADDLE_SPEED;
  let rightVy =
    (Number(held("p2-down")) - Number(held("p2-up"))) * C.PADDLE_SPEED;
  if (solo) {
    let target = C.AI_HOME_Y;
    let deadzone = C.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * C.AI_REACT;
      deadzone = C.AI_DEADZONE;
    }
    const diff = target - s.paddles.right.cy;
    rightVy =
      !s.ai.movement || Math.abs(diff) <= deadzone || dt <= 0
        ? 0
        : Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
  }
  return {
    left: integratePaddle(
      s.paddles.left,
      s.paddles.left.driven ? s.paddles.left.drivenVy : leftVy,
      dt,
    ),
    right: integratePaddle(
      s.paddles.right,
      s.paddles.right.driven ? s.paddles.right.drivenVy : rightVy,
      dt,
    ),
  };
}
export function advanceWorld(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  if (state.screen !== "countdown" && state.screen !== "playing") return state;
  let s: CaromState = { ...state, paddles: movePaddles(state, api, dt) };
  const cues = new Set<C.CueName>();
  if (s.ball) {
    let ball = s.ball;
    if (s.screen === "countdown") {
      const holdTimer = Math.max(0, ball.holdTimer - dt);
      ball = { ...ball, holdTimer };
      if (holdTimer <= 0) {
        ball = {
          ...ball,
          held: false,
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          trail: [],
        };
        s = { ...s, screen: "playing" };
      }
    } else if (!ball.held) {
      ball = flyBall(ball, s, dt, cues);
    }
    ball = {
      ...ball,
      trail: [
        ...ball.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
        { x: ball.x, y: ball.y, t: s.simTime },
      ],
    };
    s = { ...s, ball };
    if (
      s.screen === "playing" &&
      !ball.held &&
      (ball.x - C.BALL_R > C.FIELD_W || ball.x + C.BALL_R < 0)
    ) {
      const scorer: Side = ball.x > C.FIELD_CX ? "left" : "right";
      const score = {
        p1: s.score.p1 + Number(scorer === "left"),
        p2: s.score.p2 + Number(scorer === "right"),
      };
      cues.add(C.CUES.score);
      if (
        Math.max(score.p1, score.p2) >= C.WIN_SCORE &&
        Math.abs(score.p1 - score.p2) >= C.WIN_LEAD
      ) {
        s = { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 };
      } else {
        s = {
          ...s,
          score,
          receiver: scorer === "left" ? "right" : "left",
          ball: parkedBall(),
          screen: "countdown",
        };
      }
    }
  }
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  s = {
    ...s,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstaclePose(o.index, obstacleClock)),
  };
  for (const cue of cues) api.audio.play(cue);
  return s;
}
