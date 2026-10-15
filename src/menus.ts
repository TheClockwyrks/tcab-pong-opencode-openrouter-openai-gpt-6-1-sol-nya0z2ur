import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type { CaromState, Screen } from "./game";
import { returnToTitle, startMatch } from "./world";

export interface MenuRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function menuItems(screen: Screen): readonly string[] {
  switch (screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(
  s: DeepReadonly<CaromState>,
  index: number,
): MenuRect | null {
  const items = menuItems(s.screen);
  if (!Number.isInteger(index) || index < 0 || index >= items.length)
    return null;
  if (s.screen === "title")
    return { x: 110, y: 356 + index * 72, w: 428, h: 60 };
  if (s.screen === "howto") return { x: 440, y: 580, w: 400, h: 60 };
  return { x: 440, y: 342 + index * 72, w: 400, h: 60 };
}
function itemAt(s: DeepReadonly<CaromState>, x: number, y: number): number {
  return menuItems(s.screen).findIndex((_, i) => {
    const r = menuItemRect(s, i)!;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  });
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  switch (s.screen) {
    case "title": {
      const next = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...next, screen: "howto", menuIndex: 0 }
        : startMatch(next, s.menuIndex === 0 ? "solo" : "versus");
    }
    case "howto":
      return returnToTitle(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? startMatch(s, s.mode)
          : returnToTitle(s);
    case "matchover":
      return s.menuIndex === 0 ? startMatch(s, s.mode) : returnToTitle(s);
    default:
      return s;
  }
}
export function readControls(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
): CaromState {
  // Edges are consuming reads; sample each exactly once, before any transition.
  const edge = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  ) as Record<C.ActionName, boolean>;
  const samples = api.input.pointerSamples();
  const contacts = api.input.pointerContacts();
  let s: CaromState = state;
  if (edge.mute) {
    api.audio.setMuted(!api.audio.muted());
    s = { ...s, muted: api.audio.muted() };
  }
  if (
    (state.screen === "playing" || state.screen === "countdown") &&
    edge.pause
  ) {
    return {
      ...s,
      resumeScreen: state.screen,
      screen: "paused",
      menuIndex: 0,
      menuPresses: [],
    };
  }
  if (state.screen === "paused" && (edge.pause || edge.back))
    return { ...s, screen: state.resumeScreen, menuPresses: [] };
  if ((state.screen === "howto" || state.screen === "matchover") && edge.back)
    return returnToTitle(s);
  const items = menuItems(state.screen);
  if (!items.length) return s;
  const up = edge["p1-up"] || edge["p2-up"];
  const down = edge["p1-down"] || edge["p2-down"];
  const movement = state.screen !== "howto" && (up || down);
  if (movement)
    s = {
      ...s,
      menuIndex: (s.menuIndex + (up ? -1 : 1) + items.length) % items.length,
    };
  // Keyboard confirmation has priority over any same-frame pointer confirmation.
  if (!movement && edge.confirm) return { ...confirm(s), menuPresses: [] };
  let presses = [...(s.menuPresses ?? [])];
  let pointerConfirm = false;
  for (const p of samples) {
    if (p.device !== "touch" && !p.primary) continue;
    const index = itemAt(state, p.x, p.y);
    if (index >= 0) s = { ...s, menuIndex: index };
    if (p.type === "down" && p.button === "primary") {
      presses = [...presses.filter((v) => v.id !== p.id), { id: p.id, index }];
    }
    if (p.type === "up") {
      if (index >= 0 && presses.some((v) => v.id === p.id && v.index === index))
        pointerConfirm = true;
      presses = presses.filter((v) => v.id !== p.id);
    }
  }
  for (const p of contacts) {
    if (p.device !== "touch") continue;
    const index = itemAt(state, p.x, p.y);
    if (index >= 0) s = { ...s, menuIndex: index };
  }
  s = { ...s, menuPresses: presses };
  return pointerConfirm ? { ...confirm(s), menuPresses: [] } : s;
}
