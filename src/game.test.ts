import { afterEach, describe, expect, it } from "vitest";
import type { Engine } from "@clockwyrks/simple-2d";
import type { CaromDebugApi, CaromState } from "./game";
import * as C from "./constants";
import { rig } from "./test-support";

const engines: Engine<CaromState, CaromDebugApi>[] = [];
async function setup(ms = 8) {
  const r = await rig(ms);
  engines.push(r.engine);
  return r;
}
afterEach(() => {
  for (const e of engines) e.destroy();
  engines.length = 0;
});

describe("screens and controls", () => {
  it("initializes the complete title state and live diagnostics", async () => {
    const { engine: e, d, pose } = await setup();
    const s = d.snapshot(e.state);
    expect(s).toMatchObject({
      version: C.CAROM_DEBUG_VERSION,
      screen: "title",
      score: { p1: 0, p2: 0 },
      ball: { held: true, holdTimer: C.HOLD_TIME, speed: 0 },
      obstacleClock: 0,
    });
    pose((s) => d.setScore(s, 4, 3));
    expect(e.diagnostics().find((v) => v.name === "p1 score")?.value).toBe(4);
    expect(e.diagnostics().every((v) => v.error === undefined)).toBe(true);
  });
  it("wraps title navigation, remembers how-to selection, and returns to it", async () => {
    const { engine: e, press } = await setup();
    await press("KeyW");
    expect(e.state.menuIndex).toBe(2);
    await press("Enter");
    expect(e.state.screen).toBe("howto");
    expect(e.state.titleIndex).toBe(2);
    await press("Escape");
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(2);
    await press("ArrowDown");
    expect(e.state.menuIndex).toBe(0);
  });
  it("applies up before down and movement before confirmation", async () => {
    const { engine: e, key } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(2);
  });
  it("starts versus, pauses on Escape once, and resumes without losing the hold", async () => {
    const { engine: e, press } = await setup();
    await press("ArrowDown");
    await press("Enter");
    expect(e.state.mode).toBe("versus");
    expect(e.state.screen).toBe("countdown");
    const timer = e.state.ball!.holdTimer;
    await press("Escape");
    await e.advance(10);
    expect(e.state.screen).toBe("paused");
    expect(e.state.ball!.holdTimer).toBe(timer);
    await press("Escape");
    expect(e.state.screen).toBe("countdown");
    expect(e.state.ball!.holdTimer).toBeLessThan(timer);
  });
  it("moves both paddles during the countdown and clamps actual velocity", async () => {
    const { engine: e, key, press, d, pose } = await setup();
    await press("Enter");
    key("ArrowDown");
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(C.PADDLE_SPEED);
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY));
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(0);
    expect(e.state.paddles.left.cy).toBe(C.PADDLE_MAX_CY);
  });
  it("isolates local versus movement and cancels opposed keys", async () => {
    const { engine: e, key, pose, d } = await setup();
    pose((s) => d.setMode(s, "versus"));
    pose((s) => d.setScreen(s, "countdown"));
    key("KeyW");
    key("ArrowDown");
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(-C.PADDLE_SPEED);
    expect(e.state.paddles.right.vy).toBe(C.PADDLE_SPEED);
    key("KeyS");
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(0);
  });
  it("restarts a match and restores title state on quit while remembering selection", async () => {
    const { engine: e, press, pose, d, click } = await setup();
    await click(1);
    pose((s) => d.setScore(s, 7, 4));
    await press("KeyP");
    await click(1);
    expect(e.state.score).toEqual({ p1: 0, p2: 0 });
    expect(e.state.mode).toBe("versus");
    await press("KeyP");
    await click(2);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    expect(e.state.mode).toBe("solo");
    expect(e.state.simTime).toBeGreaterThan(0);
  });
  it("renders and navigates matchover, with rematch and back to title", async () => {
    const { engine: e, d, pose, press, click } = await setup();
    pose((s) => d.setScreen(s, "matchover"));
    pose((s) => d.setWinner(s, "right"));
    await e.advance(1);
    await press("ArrowUp");
    expect(e.state.menuIndex).toBe(1);
    await press("Escape");
    expect(e.state.screen).toBe("title");
    pose((s) => d.setScreen(s, "matchover"));
    pose((s) => d.setMenuIndex(s, 0));
    await click(0);
    expect(e.state.screen).toBe("countdown");
    expect(e.state.winner).toBeNull();
  });
  it("confirms a same-frame touch tap and returns from the how-to button", async () => {
    const { engine: e, pointer, click, d } = await setup();
    const r = d.menuItemRect(e.state, 2)!;
    pointer("down", r.x + 20, r.y + 20, "touch");
    pointer("up", r.x + 20, r.y + 20, "touch");
    await e.advance(1);
    expect(e.state.screen).toBe("howto");
    await click(0, "touch");
    expect(e.state.screen).toBe("title");
  });
  it("requires matching press/release regions across frames", async () => {
    const { engine: e, pointer, d } = await setup();
    const a = d.menuItemRect(e.state, 0)!,
      b = d.menuItemRect(e.state, 1)!;
    pointer("down", a.x + 5, a.y + 5);
    await e.advance(1);
    pointer("move", b.x + 5, b.y + 5);
    await e.advance(1);
    pointer("up", b.x + 5, b.y + 5);
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    pointer("down", 0, 0);
    pointer("up", a.x + 5, a.y + 5);
    await e.advance(1);
    expect(e.state.screen).toBe("title");
  });
  it("prioritizes keyboard confirm over a pointer confirm", async () => {
    const { engine: e, pointer, key, d } = await setup();
    const b = d.menuItemRect(e.state, 1)!;
    pointer("down", b.x + 5, b.y + 5);
    pointer("up", b.x + 5, b.y + 5);
    key("Enter");
    await e.advance(1);
    expect(e.state.mode).toBe("solo");
    expect(e.state.titleIndex).toBe(0);
  });
  it("toggles mute on every screen and reflects a debug mute in the cue bus", async () => {
    const { engine: e, press, pose, d, flight } = await setup();
    await press("KeyM");
    expect(e.state.muted).toBe(true);
    pose((s) => d.setMuted(s, false));
    await e.advance(1);
    expect(e.state.muted).toBe(false);
    let gain = 1;
    e.events.on("cue:played", (v) => {
      gain = v.gain;
    });
    pose((s) => d.setMuted(s, true));
    flight(400, C.BALL_R, 100, -200);
    await e.advance(1);
    expect(gain).toBe(0);
  });
});

describe("ball, collision, spin and scoring", () => {
  it.each([-1, 1] as const)(
    "serves in posed vertical direction %s without advancing that frame",
    async (sign) => {
      const { engine: e, d, pose } = await setup();
      pose((s) => d.setScreen(s, "countdown"));
      pose((s) => d.setBallServeSign(s, sign));
      pose((s) => d.setBallHoldTimer(s, 0));
      await e.advance(1);
      expect(e.state.screen).toBe("playing");
      expect(e.state.ball!.held).toBe(false);
      expect(e.state.ball!.x).toBe(C.FIELD_CX);
      expect(e.state.ball!.vx).toBeCloseTo(
        -C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
      );
      expect(e.state.ball!.vy).toBeCloseTo(
        sign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
      );
      expect(e.state.ball!.serveSign).toBe(sign);
    },
  );
  it("integrates spin as rotation, preserves speed, and decays by its half-life", async () => {
    const { engine: e, flight, d, pose } = await setup(10);
    pose((s) => d.clearWorld(s));
    pose((s) => d.spawnBall(s));
    flight(400, 300, 250, 0, 120);
    await e.advance(80);
    expect(d.snapshot(e.state).ball!.speed).toBeCloseTo(250, 7);
    expect(e.state.ball!.spin).toBeCloseTo(60, 7);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(
      e.state.ball!.trail.every((p) => e.state.simTime - p.t <= C.TRAIL_TIME),
    ).toBe(true);
  });
  it.each(["top", "bottom"])(
    "reflects off the %s wall, preserving spin and speed",
    async (wall) => {
      const { engine: e, flight, cues } = await setup();
      flight(
        350,
        wall === "top" ? C.BALL_R : C.FIELD_H - C.BALL_R,
        200,
        wall === "top" ? -400 : 400,
        25,
      );
      await e.advance(1);
      expect(Math.sign(e.state.ball!.vy)).toBe(wall === "top" ? 1 : -1);
      expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
        Math.hypot(200, 400),
      );
      expect(cues).toEqual([C.CUES.wallBounce]);
    },
  );
  it.each(["left", "right"] as const)(
    "bounces from %s paddle at the center and accelerates",
    async (side) => {
      const { engine: e, flight, cues } = await setup();
      flight(
        side === "left" ? C.P1_X1 + C.BALL_R + 1 : C.P2_X0 - C.BALL_R - 1,
        C.FIELD_CY,
        side === "left" ? -500 : 500,
        0,
      );
      await e.advance(1);
      expect(e.state.ball!.vx).toBeCloseTo(
        (side === "left" ? 1 : -1) * 500 * C.SPEED_MULT,
      );
      expect(e.state.ball!.vy).toBeCloseTo(0);
      expect(cues).toContain(C.CUES.paddleHit);
    },
  );
  it("adds paddle-motion spin using integrated velocity and caps speed", async () => {
    const { engine: e, flight, pose, d } = await setup();
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 300));
    flight(C.P1_X1 + C.BALL_R + 1, C.FIELD_CY, -C.SPEED_CAP, 0, 850);
    await e.advance(1);
    expect(e.state.ball!.spin).toBeLessThanOrEqual(C.SPIN_CLAMP);
    expect(e.state.ball!.spin).toBeGreaterThan(890);
    expect(d.snapshot(e.state).ball!.speed).toBeCloseTo(C.SPEED_CAP);
    expect(e.state.paddles.left.vy).toBe(300);
  });
  it("reflects from paddle end caps without paddle-hit speed or spin", async () => {
    const { engine: e, flight, cues } = await setup();
    flight(
      (C.P1_X0 + C.P1_X1) / 2,
      C.FIELD_CY - C.PADDLE_HALF - C.BALL_R + 1,
      0,
      200,
    );
    await e.advance(1);
    expect(e.state.ball!.vy).toBe(-200);
    expect(cues).toEqual([C.CUES.wallBounce]);
    expect(e.state.ball!.spin).toBe(0);
  });
  it("reflects from an upright obstacle and keeps its speed", async () => {
    const { engine: e, flight, d, pose, cues } = await setup();
    pose((s) => d.setObstacleClockRunning(s, false));
    const o = e.state.obstacles[0];
    flight(o.cx - C.OBSTACLE_HW - C.BALL_R - 1, o.cy, 400, 0);
    await e.advance(1);
    expect(e.state.ball!.vx).toBeCloseTo(-400);
    expect(cues).toEqual([C.CUES.obstacleBounce]);
  });
  it("reflects from a tilted obstacle in its local coordinate frame", async () => {
    const { engine: e, flight, pose, d } = await setup(4);
    pose((s) => d.setObstacleClock(s, 0.75));
    pose((s) => d.setObstacleClockRunning(s, false));
    const o = e.state.obstacles[0],
      nx = Math.cos(o.theta),
      ny = Math.sin(o.theta);
    flight(
      o.cx - nx * (C.OBSTACLE_HW + C.BALL_R + 0.5),
      o.cy - ny * (C.OBSTACLE_HW + C.BALL_R + 0.5),
      nx * 400,
      ny * 400,
    );
    await e.advance(1);
    expect(e.state.ball!.vx).toBeCloseTo(-nx * 400);
    expect(e.state.ball!.vy).toBeCloseTo(-ny * 400);
  });
  it("pushes a ball posed inside an obstacle completely outside", async () => {
    const { engine: e, flight, pose, d } = await setup();
    pose((s) => d.setObstacleClockRunning(s, false));
    const o = e.state.obstacles[0];
    flight(o.cx, o.cy, 0, 0);
    await e.advance(1);
    expect(Math.abs(e.state.ball!.x - o.cx)).toBe(C.OBSTACLE_HW + C.BALL_R);
  });
  it("does not tunnel through a paddle at the speed cap", async () => {
    const { engine: e, flight } = await setup(100);
    flight(140, C.FIELD_CY, -C.SPEED_CAP, 0);
    await e.advance(1);
    expect(e.state.ball!.vx).toBeGreaterThan(0);
    expect(e.state.ball!.x).toBeGreaterThanOrEqual(C.P1_X1 + C.BALL_R);
  });
  it("parks after a goal and serves toward the side scored on", async () => {
    const { engine: e, flight, cues } = await setup();
    flight(C.FIELD_W + C.BALL_R + 1, 200, 400, 0);
    await e.advance(1);
    expect(e.state.score).toEqual({ p1: 1, p2: 0 });
    expect(e.state.receiver).toBe("right");
    expect(e.state.screen).toBe("countdown");
    expect(e.state.ball!.trail).toEqual([]);
    expect(cues).toContain(C.CUES.score);
  });
  it("plays deuce until a two-point lead, then freezes on matchover", async () => {
    const { engine: e, flight, d, pose } = await setup();
    pose((s) => d.setScore(s, 10, 10));
    flight(-C.BALL_R - 1, 200, -400, 0);
    await e.advance(1);
    expect(e.state.score.p2).toBe(11);
    expect(e.state.screen).toBe("countdown");
    flight(-C.BALL_R - 1, 200, -400, 0);
    await e.advance(1);
    expect(e.state.winner).toBe("right");
    expect(e.state.screen).toBe("matchover");
    const ball = e.state.ball;
    await e.advance(3);
    expect(e.state.ball).toEqual(ball);
  });
  it("keeps collision outcomes and speed stable across 2ms and 16ms frames", async () => {
    const run = async (ms: number) => {
      const { engine: e, flight, d, pose, cues } = await setup(ms);
      pose((s) => d.clearWorld(s));
      pose((s) => d.spawnBall(s));
      flight(400, C.FIELD_CY, -650, 0, 80);
      await e.advance(1600 / ms);
      return { s: d.snapshot(e.state), cues };
    };
    const a = await run(2),
      b = await run(16);
    expect(a.cues).toContain(C.CUES.paddleHit);
    expect(a.s.ball!.speed).toBeGreaterThan(650);
    expect(a.cues).toEqual(b.cues);
    expect(a.s.score).toEqual(b.s.score);
    expect(Math.abs(a.s.ball!.speed - b.s.ball!.speed)).toBeLessThan(10);
    expect(Math.sign(a.s.ball!.vx)).toBe(Math.sign(b.s.ball!.vx));
  }, 20000);
});

describe("debug world and AI", () => {
  it("clears entities, refuses absent ball poses, and respawns obstacles in clock order", async () => {
    const { engine: e, d, pose } = await setup();
    pose((s) => d.clearWorld(s));
    pose((s) => d.setScreen(s, "playing"));
    await e.advance(1);
    expect(e.state.ball).toBeNull();
    expect(e.state.obstacles).toEqual([]);
    const poses = [
      () => d.setBallPosition(e.state, 1, 2),
      () => d.setBallVelocity(e.state, 1, 2),
      () => d.setBallSpin(e.state, 2),
      () => d.setBallHeld(e.state, false),
      () => d.setBallHoldTimer(e.state, 0),
      () => d.setBallServeSign(e.state, 1),
      () => d.drawBallServeSign(e.state),
    ];
    for (const fn of poses) expect(fn).toThrow(/absent/);
    expect(() => d.spawnObstacle(e.state, 2)).toThrow();
    pose((s) => d.setObstacleClock(s, 1.5));
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.spawnObstacle(s, 0));
    expect(e.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    expect(e.state.obstacles[0].theta).toBeCloseTo(1.5 * C.OBSTACLE_SPIN_RATE);
    pose((s) => d.spawnBall(s));
    expect(e.state.ball!.held).toBe(true);
  });
  it("separates driven velocity from actual velocity and releases each side independently", async () => {
    const { engine: e, d, pose } = await setup();
    pose((s) => d.setPaddleVy(s, "right", -200));
    expect(e.state.paddles.right.vy).toBe(0);
    pose((s) => d.setPaddleDriven(s, "right", true));
    pose((s) => d.setScreen(s, "countdown"));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(-200);
    expect(e.state.paddles.left.driven).toBe(false);
    pose((s) => d.setPaddleDriven(s, "right", false));
    await e.advance(1);
    expect(e.state.paddles.right.drivenVy).toBe(-200);
  });
  it("gates AI sensing and movement separately", async () => {
    const { engine: e, flight, d, pose } = await setup();
    flight(700, 600, 400, 0);
    pose((s) => d.setMode(s, "solo"));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(C.AI_SPEED);
    pose((s) => d.setAiTracking(s, false));
    pose((s) => d.setPaddleCy(s, "right", 600));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(-C.AI_SPEED);
    pose((s) => d.setAiMovement(s, false));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
  });
  it("advances the obstacle clock after play and freezes it on menus and pause", async () => {
    const { engine: e, pose, d } = await setup(10);
    pose((s) => d.setScreen(s, "countdown"));
    await e.advance(2);
    expect(e.state.obstacleClock).toBeCloseTo(0.02);
    expect(e.state.obstacles[0].cy + e.state.obstacles[1].cy).toBeCloseTo(
      C.FIELD_H,
    );
    pose((s) => d.setObstacleClockRunning(s, false));
    await e.advance(1);
    expect(e.state.obstacleClock).toBeCloseTo(0.02);
    pose((s) => d.setObstacleClockRunning(s, true));
    pose((s) => d.setScreen(s, "paused"));
    await e.advance(1);
    expect(e.state.obstacleClock).toBeCloseTo(0.02);
    expect(e.state.simTime).toBeCloseTo(0.04);
  });
  it("reconciles without advancing, colliding, serving, drawing a sign or playing sound", async () => {
    const { engine: e, pose, d, cues } = await setup();
    pose((s) => d.setBallPosition(s, C.P1_X0, C.FIELD_CY));
    pose((s) => d.setBallVelocity(s, 300, 400));
    const before = d.snapshot(e.state);
    pose(d.reconcile);
    pose(d.reconcile);
    expect(d.snapshot(e.state)).toEqual(before);
    expect(cues).toEqual([]);
    expect(before.ball!.speed).toBe(500);
  });
  it("resets every declared field, keeps mute and does not mutate prior state", async () => {
    const { engine: e, pose, d } = await setup();
    const original = e.state;
    pose((s) => d.setMuted(s, true));
    pose((s) => d.setScreen(s, "paused"));
    pose((s) => d.setTitleIndex(s, 2));
    pose((s) => d.setResumeScreen(s, "countdown"));
    pose((s) => d.setReceiver(s, "right"));
    pose((s) => d.setAiMovement(s, false));
    pose((s) => d.setPaddleDriven(s, "left", true));
    await e.advance(1);
    pose(d.reset);
    expect(e.state).toEqual({
      ...original,
      muted: true,
      ball: { ...original.ball!, serveSign: e.state.ball!.serveSign },
    });
    expect(original.muted).toBe(false);
    expect(original.simTime).toBe(0);
  });
  it("reports only real menu hit regions and defensive snapshot copies", async () => {
    const { engine: e, d, pose } = await setup();
    expect(d.menuItemRect(e.state, -1)).toBeNull();
    expect(d.menuItemRect(e.state, 3)).toBeNull();
    pose((s) => d.setScreen(s, "playing"));
    expect(d.menuItemRect(e.state, 0)).toBeNull();
    const a = d.snapshot(e.state),
      b = d.snapshot(e.state);
    expect(a).toEqual(b);
    expect(a.paddles).not.toBe(b.paddles);
    expect(a.ball!.trail).not.toBe(b.ball!.trail);
    e.setClock({ delta: () => 0 });
    await e.advance(1);
    expect(e.state.simTime).toBe(0);
  });
});
