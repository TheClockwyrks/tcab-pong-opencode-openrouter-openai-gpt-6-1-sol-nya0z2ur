import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import type { Transition } from "@clockwyrks/simple-2d";
import { game } from "./game";
import type { CaromState } from "./game";
import * as C from "./constants";

/** Real engine, real canvas, synthetic clock and event surface; no DOM needed. */
export async function rig(stepMs = 8) {
  const target = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    background: "#0a1119",
    layout: C.LAYOUT,
    game,
    clock: new ConstantClock(stepMs),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  const cues: string[] = [];
  engine.events.on("cue:played", (e) => cues.push(e.cue));
  await engine.initialize();
  const key = (code: string, down = true) =>
    target.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const pointer = (
    type: "down" | "move" | "up",
    x: number,
    y: number,
    device = "mouse",
    id = 1,
  ) =>
    target.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: id === 1,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const pose = (transition: Transition<CaromState>) => engine.apply(transition);
  const press = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, false);
  };
  const click = async (index: number, device = "mouse") => {
    const r = engine.debug.menuItemRect(engine.state, index)!;
    pointer("down", r.x + r.w / 2, r.y + r.h / 2, device);
    await engine.advance(1);
    pointer("up", r.x + r.w / 2, r.y + r.h / 2, device);
    await engine.advance(1);
  };
  const flight = (x: number, y: number, vx: number, vy: number, spin = 0) => {
    const d = engine.debug;
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setBallPosition(s, x, y));
    pose((s) => d.setBallVelocity(s, vx, vy));
    pose((s) => d.setBallSpin(s, spin));
    pose((s) => d.setMode(s, "versus"));
  };
  return {
    engine,
    d: engine.debug,
    target,
    cues,
    key,
    press,
    pointer,
    pose,
    click,
    flight,
  };
}
