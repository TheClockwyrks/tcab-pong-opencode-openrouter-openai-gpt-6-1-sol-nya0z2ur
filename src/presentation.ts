import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import * as P from "./palette";
import type { CaromState } from "./game";
import { menuItemRect, menuItems } from "./menus";

type Context = CanvasRenderingContext2D;
type State = DeepReadonly<CaromState>;
const SANS = '"Arial", sans-serif';
const MONO = '"Courier New", monospace';

function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  size = 14,
  color = P.INK,
  weight = 400,
  align: CanvasTextAlign = "left",
  mono = false,
): void {
  ctx.font = `${weight} ${size}px ${mono ? MONO : SANS}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function line(
  ctx: Context,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color = P.LINE,
  width = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function round(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
function circle(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function key(ctx: Context, value: string, x: number, y: number, w = 28): void {
  round(ctx, x, y - 12, w, 24, 4, "#192832");
  text(ctx, value, x + w / 2, y + 1, 12, P.INK, 400, "center", true);
}
function arrow(ctx: Context, x: number, y: number, color = P.INK): void {
  line(ctx, x - 14, y, x + 5, y, color, 2);
  line(ctx, x - 1, y - 6, x + 5, y, color, 2);
  line(ctx, x - 1, y + 6, x + 5, y, color, 2);
}
function background(ctx: Context): void {
  ctx.fillStyle = P.BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  const wash = ctx.createRadialGradient(850, 290, 40, 850, 290, 650);
  wash.addColorStop(0, "#12242d");
  wash.addColorStop(1, P.BACKGROUND);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#203039";
  for (let x = 32; x < C.FIELD_W; x += 32) {
    for (let y = 32; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
  }
}
function logo(ctx: Context, x: number, y: number, scale = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0.3, Math.PI * 1.8);
  ctx.strokeStyle = P.LEFT;
  ctx.lineWidth = 3;
  ctx.stroke();
  circle(ctx, 10, -8, 4, P.LEFT);
  ctx.restore();
}
function masthead(ctx: Context, s: State): void {
  logo(ctx, 66, 57);
  text(ctx, C.TITLE_TEXT, 92, 57, 16, P.INK, 700);
  line(ctx, 190, 46, 190, 68);
  text(
    ctx,
    "THE PADDLE DUEL, WITH A TWIST.",
    212,
    57,
    11,
    P.MUTED,
    400,
    "left",
    true,
  );
  circle(ctx, 1050, 57, 3, s.muted ? P.RIGHT : P.LEFT);
  text(
    ctx,
    s.muted ? "SOUND OFF" : "SOUND ON",
    1063,
    57,
    11,
    P.MUTED,
    400,
    "left",
    true,
  );
  key(ctx, "M", 1186, 57);
  line(ctx, 52, 92, 1228, 92);
}
function footer(ctx: Context, label: string): void {
  line(ctx, 52, 650, 1228, 650);
  text(ctx, label, 64, 680, 11, P.MUTED, 400, "left", true);
  text(
    ctx,
    "BUILT FOR THE RICOCHET.",
    1216,
    680,
    11,
    P.MUTED,
    400,
    "right",
    true,
  );
}
function menu(ctx: Context, s: State): void {
  const title = s.screen === "title";
  menuItems(s.screen).forEach((item, i) => {
    const r = menuItemRect(s, i)!;
    const selected = s.menuIndex === i;
    round(ctx, r.x, r.y, r.w, r.h, 6, selected ? P.LEFT : P.PANEL);
    if (!selected) {
      ctx.strokeStyle = P.LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 6);
      ctx.stroke();
    }
    const color = selected ? P.BACKGROUND : P.INK;
    if (title)
      text(
        ctx,
        `0${i + 1}`,
        r.x + 22,
        r.y + r.h / 2,
        12,
        selected ? "#37564b" : P.MUTED,
        400,
        "left",
        true,
      );
    text(ctx, item, r.x + (title ? 65 : 24), r.y + r.h / 2, 17, color, 700);
    if (title && i < 2)
      text(
        ctx,
        i === 0 ? "YOU × AI" : "YOU × FRIEND",
        r.x + r.w - 61,
        r.y + r.h / 2,
        10,
        selected ? "#37564b" : P.MUTED,
        400,
        "right",
        true,
      );
    if (selected) arrow(ctx, r.x + r.w - 25, r.y + r.h / 2, color);
  });
}
function titleDiagram(ctx: Context): void {
  const x = 670,
    y = 202,
    w = 496,
    h = 328;
  text(ctx, "01 / READ THE ANGLES", x, 166, 11, P.AMBER, 400, "left", true);
  round(ctx, x, y, w, h, 8, "#0c1821");
  ctx.strokeStyle = "#30434c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
  ctx.save();
  ctx.setLineDash([4, 8]);
  line(ctx, x + w / 2, y + 16, x + w / 2, y + h - 16, "#2b3a42");
  ctx.restore();
  round(ctx, x + 22, y + 156, 7, 65, 3, P.LEFT);
  round(ctx, x + w - 29, y + 85, 7, 65, 3, P.RIGHT);
  for (const [ox, oy] of [
    [178, 98],
    [318, 230],
  ]) {
    ctx.save();
    ctx.translate(x + ox, y + oy);
    ctx.rotate(-0.48);
    round(ctx, -4, -36, 8, 72, 4, P.AMBER);
    ctx.restore();
    circle(ctx, x + ox, y + oy, 2, P.BACKGROUND);
  }
  ctx.beginPath();
  ctx.moveTo(x + 34, y + 184);
  ctx.bezierCurveTo(x + 90, y + 186, x + 117, y + 139, x + 166, y + 127);
  ctx.bezierCurveTo(x + 225, y + 146, x + 242, y + 285, x + 304, y + 283);
  ctx.bezierCurveTo(x + 362, y + 282, x + 386, y + 193, x + 420, y + 176);
  ctx.strokeStyle = "#385f5c";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x + 304, y + 283);
  ctx.bezierCurveTo(x + 362, y + 282, x + 386, y + 193, x + 420, y + 176);
  ctx.strokeStyle = P.LEFT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 20;
  ctx.shadowColor = P.LEFT;
  circle(ctx, x + 420, y + 176, 8, P.INK);
  ctx.shadowBlur = 0;
  text(ctx, "SPIN", x + 80, y + 232, 10, P.LEFT, 400, "left", true);
  text(ctx, "BANK", x + 202, y + 84, 10, P.AMBER, 400, "left", true);
  text(ctx, "OUTPLAY.", x + 353, y + 136, 10, P.INK, 400, "left", true);
  line(ctx, x, 566, x + 28, 566, P.LEFT, 2);
  text(ctx, "A moving paddle bends the next shot.", x + 42, 566, 15, P.INK);
  text(
    ctx,
    "Two turning obstacles change every rally.",
    x + 42,
    592,
    13,
    P.MUTED,
  );
}
function title(ctx: Context, s: State): void {
  masthead(ctx, s);
  text(
    ctx,
    "ANGLES. INSTINCT. A LITTLE ENGLISH.",
    110,
    157,
    11,
    P.LEFT,
    400,
    "left",
    true,
  );
  text(ctx, C.TITLE_TEXT, 101, 244, 118, P.INK, 900);
  text(ctx, "Find your edge.", 110, 319, 23, P.MUTED);
  menu(ctx, s);
  titleDiagram(ctx);
  key(ctx, "↑ ↓", 110, 606, 44);
  text(ctx, "SELECT", 166, 606, 10, P.MUTED, 400, "left", true);
  key(ctx, "↵", 248, 606, 30);
  text(ctx, "PLAY", 290, 606, 10, P.MUTED, 400, "left", true);
  footer(
    ctx,
    "SOLO OR LOCAL VERSUS  /  FIRST TO " +
      C.WIN_SCORE +
      ", WIN BY " +
      C.WIN_LEAD,
  );
}
function howto(ctx: Context, s: State): void {
  masthead(ctx, s);
  text(ctx, "THE PLAYBOOK", 110, 145, 11, P.LEFT, 400, "left", true);
  text(ctx, "Simple rules. Wicked angles.", 110, 199, 43, P.INK, 700);
  const cards = [
    {
      title: "MEET THE BALL",
      color: P.LEFT,
      lines: [
        "Slide to defend your goal.",
        "W / S moves the left paddle.",
        "↑ / ↓ moves the right in Versus.",
        "In Solo, either pair is yours.",
      ],
    },
    {
      title: "PUT A CURVE ON IT",
      color: P.INK,
      lines: [
        "Move your paddle as you strike.",
        "Your motion adds spin; the ball",
        "curves through the air. Catch an",
        "edge for a sharper return.",
      ],
    },
    {
      title: "PLAY THE BANK",
      color: P.AMBER,
      lines: [
        "The amber obstacles sway and turn.",
        "Use their faces for bank shots,",
        "or find the gap. First to " + C.WIN_SCORE,
        "wins, with a " + C.WIN_LEAD + "-point lead.",
      ],
    },
  ];
  cards.forEach((card, i) => {
    const x = 110 + i * 360;
    round(ctx, x, 258, 340, 272, 8, P.PANEL);
    text(ctx, `0${i + 1}`, x + 24, 290, 11, card.color, 400, "left", true);
    if (i === 0) {
      round(ctx, x + 29, 323, 7, 52, 3, P.LEFT);
      circle(ctx, x + 92, 348, 7, P.INK);
      line(ctx, x + 48, 348, x + 79, 348, P.MUTED, 2);
      key(ctx, "W", x + 240, 337);
      key(ctx, "S", x + 278, 361);
    } else if (i === 1) {
      ctx.beginPath();
      ctx.moveTo(x + 28, 367);
      ctx.bezierCurveTo(x + 95, 377, x + 140, 324, x + 208, 329);
      ctx.strokeStyle = P.LEFT;
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(ctx, x + 208, 329, 7, P.INK);
    } else {
      ctx.save();
      ctx.translate(x + 150, 346);
      ctx.rotate(0.6);
      round(ctx, -5, -31, 10, 62, 4, P.AMBER);
      ctx.restore();
      line(ctx, x + 28, 370, x + 137, 347, P.MUTED, 2);
      line(ctx, x + 137, 347, x + 95, 316, P.LEFT, 2);
    }
    text(ctx, card.title, x + 24, 405, 16, card.color, 700);
    card.lines.forEach((value, j) =>
      text(ctx, value, x + 24, 439 + j * 20, 13, P.MUTED),
    );
  });
  menu(ctx, s);
  footer(ctx, "P / ESC  PAUSE     M  SOUND     ENTER / SPACE  CONFIRM");
}
function furniture(ctx: Context, s: State): void {
  // Quiet court markings: the walls are the logical field edges.
  line(ctx, 0, 1, C.FIELD_W, 1, "#53646b", 2);
  line(ctx, 0, C.FIELD_H - 1, C.FIELD_W, C.FIELD_H - 1, "#53646b", 2);
  line(ctx, 31, 0, 31, C.FIELD_H, "#20363a");
  line(ctx, C.FIELD_W - 31, 0, C.FIELD_W - 31, C.FIELD_H, "#3b2b2d");
  ctx.save();
  ctx.setLineDash([7, 13]);
  line(ctx, C.NET_X, 122, C.NET_X, C.FIELD_H - 60, "#2b3c45", 2);
  ctx.restore();
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.beginPath();
    ctx.arc(0, 0, C.OBSTACLE_HH + 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#293436";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(o.theta);
    ctx.shadowColor = P.AMBER;
    ctx.shadowBlur = 14;
    round(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      6,
      P.AMBER,
    );
    ctx.shadowBlur = 0;
    circle(ctx, 0, 0, 3, "#7c673f");
    line(ctx, -4, -C.OBSTACLE_HH + 11, 4, -C.OBSTACLE_HH + 11, "#fff0c4");
    ctx.restore();
  }
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side],
      color = side === "left" ? P.LEFT : P.RIGHT;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 19;
    round(
      ctx,
      side === "left" ? C.P1_X0 : C.P2_X0,
      p.cy - C.PADDLE_HALF,
      C.PADDLE_W,
      C.PADDLE_H,
      6,
      color,
    );
    ctx.restore();
  }
  const b = s.ball;
  if (b) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const trail = b.trail;
    for (let i = 1; i < trail.length; i++) {
      // Menus keep simTime ticking, but a paused court stays visually frozen.
      const age = (trail[trail.length - 1].t - trail[i].t) / C.TRAIL_TIME;
      ctx.globalAlpha = Math.max(0, 1 - age) * 0.5;
      line(
        ctx,
        trail[i - 1].x,
        trail[i - 1].y,
        trail[i].x,
        trail[i].y,
        Math.abs(b.spin) > 60 ? P.LEFT : P.INK,
        C.BALL_R * (1 - age * 0.7),
      );
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = P.INK;
    ctx.shadowBlur = 20;
    circle(ctx, b.x, b.y, C.BALL_R, P.INK);
    ctx.restore();
  }
}
function scoreboard(ctx: Context, s: State): void {
  text(ctx, "PLAYER 01", 99, 43, 12, P.LEFT, 400, "left", true);
  text(
    ctx,
    s.mode === "solo" ? "THE CHALLENGER" : "PLAYER 02",
    1181,
    43,
    12,
    P.RIGHT,
    400,
    "right",
    true,
  );
  text(
    ctx,
    s.mode === "solo" ? "W / S  OR  ↑ / ↓" : "W / S",
    99,
    65,
    10,
    P.MUTED,
    400,
    "left",
    true,
  );
  text(
    ctx,
    s.mode === "solo" ? "AI OPPONENT" : "↑ / ↓",
    1181,
    65,
    10,
    P.MUTED,
    400,
    "right",
    true,
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    549,
    62,
    63,
    P.LEFT,
    700,
    "center",
    true,
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    731,
    62,
    63,
    P.RIGHT,
    700,
    "center",
    true,
  );
  text(ctx, "VS", C.FIELD_CX, 59, 11, P.MUTED, 400, "center", true);
  text(
    ctx,
    s.mode === "solo" ? "SOLO / HUMAN × MACHINE" : "VERSUS / LOCAL DUEL",
    C.FIELD_CX,
    111,
    10,
    P.MUTED,
    400,
    "center",
    true,
  );
  text(ctx, C.TITLE_TEXT, 99, 687, 12, P.INK, 700);
  text(
    ctx,
    "FIRST TO " + C.WIN_SCORE + " · WIN BY " + C.WIN_LEAD,
    183,
    687,
    10,
    P.MUTED,
    400,
    "left",
    true,
  );
  const spin = s.ball?.spin ?? 0;
  text(ctx, "SPIN", 525, 687, 10, P.MUTED, 400, "left", true);
  round(ctx, 575, 684, 130, 5, 2, P.LINE);
  const extent = (Math.abs(spin) / C.SPIN_CLAMP) * 65;
  round(
    ctx,
    spin < 0 ? C.FIELD_CX - extent : C.FIELD_CX,
    684,
    Math.max(1, extent),
    5,
    2,
    P.LEFT,
  );
  line(ctx, C.FIELD_CX, 681, C.FIELD_CX, 692, P.MUTED);
  text(
    ctx,
    `${Math.round(Math.hypot(s.ball?.vx ?? 0, s.ball?.vy ?? 0))} U/S`,
    730,
    687,
    10,
    P.MUTED,
    400,
    "left",
    true,
  );
  text(
    ctx,
    (s.muted ? "M  SOUND OFF" : "M  SOUND ON") + "    P / ESC  PAUSE",
    1181,
    687,
    10,
    P.MUTED,
    400,
    "right",
    true,
  );
}
function countdown(ctx: Context, s: State): void {
  if (!s.ball) return;
  const y = C.FIELD_CY - 76;
  round(ctx, C.FIELD_CX - 105, y - 25, 210, 48, 24, P.PANEL);
  text(
    ctx,
    "READY TO RICOCHET",
    C.FIELD_CX,
    y - 4,
    11,
    P.LEFT,
    700,
    "center",
    true,
  );
  const progress = 1 - s.ball.holdTimer / C.HOLD_TIME;
  round(ctx, C.FIELD_CX - 65, y + 12, 130, 2, 1, P.LINE);
  round(
    ctx,
    C.FIELD_CX - 65,
    y + 12,
    Math.max(1, progress * 130),
    2,
    1,
    P.LEFT,
  );
  text(
    ctx,
    s.receiver === "left" ? "← SERVING LEFT" : "SERVING RIGHT →",
    C.FIELD_CX,
    C.FIELD_CY + 50,
    10,
    P.MUTED,
    400,
    "center",
    true,
  );
}
function overlay(ctx: Context, s: State): void {
  ctx.fillStyle = "#060c14d9";
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  round(ctx, 390, 153, 500, s.screen === "paused" ? 443 : 374, 12, "#101d27");
  line(ctx, 440, 182, 840, 182, s.screen === "paused" ? P.LEFT : P.AMBER, 2);
  text(
    ctx,
    s.screen === "paused" ? "TAKE A BREATHER" : "THE LAST WORD",
    C.FIELD_CX,
    220,
    11,
    s.screen === "paused" ? P.LEFT : P.AMBER,
    400,
    "center",
    true,
  );
  const winner =
    s.winner === "left"
      ? "PLAYER 01"
      : s.mode === "solo"
        ? "THE AI"
        : "PLAYER 02";
  text(
    ctx,
    s.screen === "paused" ? "Rally on hold." : winner + " WINS",
    C.FIELD_CX,
    267,
    s.screen === "paused" ? 40 : 32,
    P.INK,
    700,
    "center",
  );
  text(
    ctx,
    s.screen === "paused"
      ? "The angles can wait."
      : `${s.score.p1}  —  ${s.score.p2}   /   GOOD GAME.`,
    C.FIELD_CX,
    308,
    13,
    P.MUTED,
    400,
    "center",
    s.screen !== "paused",
  );
  menu(ctx, s);
  text(
    ctx,
    s.screen === "paused" ? "P / ESC TO RESUME" : "ONE MORE?",
    C.FIELD_CX,
    s.screen === "paused" ? 626 : 557,
    10,
    P.MUTED,
    400,
    "center",
    true,
  );
}
export function drawGame(s: State, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  background(ctx);
  if (s.screen === "title") title(ctx, s);
  else if (s.screen === "howto") howto(ctx, s);
  else {
    furniture(ctx, s);
    scoreboard(ctx, s);
    if (s.screen === "countdown") countdown(ctx, s);
    if (s.screen === "paused" || s.screen === "matchover") overlay(ctx, s);
  }
  ctx.restore();
}
