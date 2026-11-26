# Sky Courier — Ring Run over Pine Valley

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/cocolats18-svg/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/cocolats18-svg/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete original flight game: fly the red courier plane down Pine Valley, thread
all 12 golden rings, then bring her in slow and centred on the runway for the landing
bonus. Three lives, a fuel gauge that punishes full throttle, and a timer that rewards
a fast, clean run.

## How to play

- **Arrows / WASD** — steer (bank and turn) and climb / dive
- **Shift / Ctrl** — throttle up / down
- **Mouse** — steer by position
- **Enter / Space / click** — take off and restart
- **M** — mute

Rings refuel you (+9 fuel) and score 100 points, 125 if you are over 85 kt through
one. Miss a ring and it is gone. After the last ring the runway is your finish line:
touch down under 70 kt and near the centre line for up to 500 bonus points. Hit the
ground, clip a mountain or run dry and you lose a life.

## What is in the frame

A chase view from behind the plane over procedural Pine Valley: rolling green floor,
mountain walls, a winding river, pine trees, a little town with red roofs, drifting
clouds and the runway at the end of the course. The HUD shows score, rings, time and
fuel, a compass strip, and lit instruments — altimeter, airspeed and a throttle bar.

## Sound

All sound is synthesised with WebAudio: an engine hum that follows throttle and
speed, a chime for each ring, a noise burst for a crash and an arpeggio for landing.
No audio files.

## Screenshots

The three screenshots are real renders of this game's own code in a headless browser,
staged deterministically with `?shot=start|play|end&seed=1` — the same seed always
gives the same frame.

## Files

- `game/index.html` — the page
- `game/src/main.js` — bootstrap and fixed-step loop
- `game/src/game.js` — rules: rings, fuel, lives, landing, score
- `game/src/plane.js` — plane physics (throttle, bank, pitch, heading)
- `game/src/terrain.js` — Pine Valley: height field, river, town, runway, rings
- `game/src/render.js` — chase-view drawing, HUD and lit instruments
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/random.js` — seeded RNG and value noise
- `game/src/shots.js` — deterministic screenshot scenes

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

Hand it in with `MAKEFUN_OUTPUT_DIR=out node main.ts`.
