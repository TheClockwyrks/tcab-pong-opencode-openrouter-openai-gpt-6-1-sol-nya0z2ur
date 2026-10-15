import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type {
  BallState,
  CaromState,
  ObstacleState,
  PaddleState,
  Side,
} from "./game";
import { clamp } from "./math";

// Only this local working value is mutable; input state is never written.
type Flight = { -readonly [K in keyof BallState]: BallState[K] };
function paddleContact(
  b: Flight,
  p: DeepReadonly<PaddleState>,
  side: Side,
  cues: Set<C.CueName>,
): void {
  const x0 = side === "left" ? C.P1_X0 : C.P2_X0;
  const x1 = side === "left" ? C.P1_X1 : C.P2_X1;
  const y0 = p.cy - C.PADDLE_HALF,
    y1 = p.cy + C.PADDLE_HALF;
  const depths = [
    b.x - (x0 - C.BALL_R),
    x1 + C.BALL_R - b.x,
    b.y - (y0 - C.BALL_R),
    y1 + C.BALL_R - b.y,
  ];
  if (depths.some((d) => d <= 0)) return;
  const face = depths.indexOf(Math.min(...depths));
  if (face < 2) {
    const theta =
      clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
    const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
    b.vx = (side === "left" ? 1 : -1) * speed * Math.cos(theta);
    b.vy = speed * Math.sin(theta);
    b.spin = clamp(
      b.spin + p.vy * C.SPIN_FROM_PADDLE,
      -C.SPIN_CLAMP,
      C.SPIN_CLAMP,
    );
    b.x = side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
    cues.add(C.CUES.paddleHit);
  } else {
    b.y = face === 2 ? y0 - C.BALL_R : y1 + C.BALL_R;
    if ((face === 2 && b.vy > 0) || (face === 3 && b.vy < 0)) {
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
  }
}
function obstacleContact(
  b: Flight,
  o: DeepReadonly<ObstacleState>,
  cues: Set<C.CueName>,
): void {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta);
  const dx = b.x - o.cx,
    dy = b.y - o.cy;
  const lx = dx * c + dy * s,
    ly = -dx * s + dy * c;
  const qx = clamp(lx, -C.OBSTACLE_HW, C.OBSTACLE_HW),
    qy = clamp(ly, -C.OBSTACLE_HH, C.OBSTACLE_HH);
  const dist = Math.hypot(lx - qx, ly - qy);
  if (dist >= C.BALL_R) return;
  let nx: number, ny: number, push: number;
  if (dist > 0) {
    nx = (lx - qx) / dist;
    ny = (ly - qy) / dist;
    push = C.BALL_R - dist;
  } else {
    const depths = [
      lx + C.OBSTACLE_HW,
      C.OBSTACLE_HW - lx,
      ly + C.OBSTACLE_HH,
      C.OBSTACLE_HH - ly,
    ];
    const face = depths.indexOf(Math.min(...depths));
    nx = face === 0 ? -1 : face === 1 ? 1 : 0;
    ny = face === 2 ? -1 : face === 3 ? 1 : 0;
    push = depths[face] + C.BALL_R;
  }
  const wx = nx * c - ny * s,
    wy = nx * s + ny * c;
  const dot = b.vx * wx + b.vy * wy;
  if (dot < 0) {
    b.vx -= 2 * dot * wx;
    b.vy -= 2 * dot * wy;
    cues.add(C.CUES.obstacleBounce);
  }
  b.x += wx * push;
  b.y += wy * push;
}
export function flyBall(
  ball: DeepReadonly<BallState>,
  state: DeepReadonly<CaromState>,
  dt: number,
  cues: Set<C.CueName>,
): BallState {
  const b: Flight = { ...ball };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const angle = (b.spin / speed) * h,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const vx = b.vx * c - b.vy * s;
      b.vy = b.vx * s + b.vy * c;
      b.vx = vx;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
    paddleContact(b, state.paddles.left, "left", cues);
    paddleContact(b, state.paddles.right, "right", cues);
    for (const o of state.obstacles) obstacleContact(b, o, cues);
  }
  return b;
}
