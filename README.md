# Carom

**The paddle duel, with a twist.** A self-contained browser game for one player
against an AI, or two players sharing a keyboard. Move your paddle as you strike
to curve the ball, and bank shots off two swaying, rotating obstacles. First to
11 wins, with a two-point lead.

Everything is drawn on canvas. The four short audio cues are synthesized by the
Simple 2D engine; no art, audio downloads, accounts, or backend are needed.

## Run locally

Use a current Node.js release supported by Vite (Node 22.12+ or 24+).

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. Choose **SOLO**, **VERSUS**, or **HOW TO PLAY**
with the keyboard, mouse, or touch.

## Production build

```sh
npm ci
npm run build
```

The complete static site is in `dist/`, with `index.html` at its root. Serve that
directory at the root of any static host. To check it locally:

```sh
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| W / S | Move the left paddle |
| ↑ / ↓ | Move the right paddle in Versus; also move your left paddle in Solo |
| W / S or ↑ / ↓ on menus | Select an item |
| Enter / Space | Confirm |
| P / Escape | Pause or resume a match |
| Escape on help or match results | Return to the menu |
| M | Toggle sound on any screen |
| Backtick | Toggle the engine's diagnostic overlay |

Menus also support pointing and clicking or tapping. On touch devices, the
engine provides two vertical movement sliders and menu controls. The court keeps
its 16:9 shape at every window size.

## How to play

Protect the goal behind your paddle. A centered contact sends a flat return;
contacts near the ends send sharper angles. Sliding into a contact adds spin in
the direction of your motion. Spin bends flight and gradually fades. The amber
obstacles reflect the ball off their current tilted faces without changing its
speed. Every paddle hit makes the rally faster.

Both paddles can move during the short pre-serve hold. After a point, the next
serve travels toward the side that conceded. Play continues past 10–10 until
someone is two points ahead. Pause offers resume, restart, and quit; match results
offer a rematch.

## Development and verification

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests run the real engine over a Node canvas and a controlled clock. They exercise
the state machine, keyboard and pointer input, spin, oriented collisions, AI,
serves, scoring, and the debug API, including a 2 ms / 16 ms simulation comparison.
Coverage and test results are written to `coverage/`.

`src/game.ts` exports the readonly state contract and game entry point. `world.ts`
and `physics.ts` handle simulation; `menus.ts` handles menu transitions and hit
regions; `presentation.ts` draws the game; `debug.ts` implements the engine-only
automation surface. Read `engine/` for the runtime APIs and `specs/` for the game
contracts. The debug surface is available through `engine.debug`, with poses
applied through `engine.apply`; it is never installed on the browser page.

The player-facing description, screenshots, and an engine-recorded rally are in
`showcase/`.
