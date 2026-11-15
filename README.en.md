# Mission Architect / Görev Mimarı

A free browser game for the NASA Space Apps Challenge 2026 challenge **"Space Mission Design Game"**. Players pick a mission, design the spacecraft, launch it, fly it month by month, and learn why it succeeded or failed. The game is in English and Turkish.

**Play:** https://mission-architect.github.io/?lang=en. No install and no account are needed, and it works on phones.

## How to play
1. **Choose a mission.** There are four, each based on a real kind of NASA mission:

   | Mission | Level | Inspired by |
   |---|---|---|
   | Wildfire Watch (Earth) | Beginner | Landsat 8 |
   | Lunar Ice Hunter (Moon) | Intermediate | LRO |
   | Red Planet Climate (Mars) | Advanced | MAVEN |
   | Ocean World Explorer (Europa) | Expert | Europa Clipper |

2. **Design the spacecraft** in four steps: Mission → Instruments → Spacecraft → Launch.
   - Five live gauges show money, mass, power, data and science.
   - The 3D model of the craft changes with every choice.
3. **Launch and fly.**
   - The launch is in 3D, using NASA rocket models.
   - The cruise is shown as a 2D transfer orbit.
   - The orbit view shows the craft circling a NASA-textured planet.
   - Surprise events ask the responsible team role to decide.
4. **Read the report.** It shows:
   - a score out of 1000 and plain-language lessons;
   - a side-by-side comparison with the real NASA mission;
   - badges, and a downloadable mission card image.

You can play alone or with friends. Up to four friends can share one device and take turns, or join an online room from their own devices. In both cases the four roles are Mission Manager, Spacecraft Engineer, Science Lead and Communications Lead.

## What it teaches
- **The rocket equation:** mass costs fuel, and fuel costs money.
- **The inverse-square law** for sunlight and radio. This is why Europa needs huge solar arrays or nuclear power, and a big dish.
- **Trade-offs** between science, budget, risk and schedule. These include launch windows, radiation and eclipse time.

## Run locally
No build step is needed. Start any static web server in the project folder:

```bash
python -m http.server 8765
```

Then open http://localhost:8765. Use the TR/EN buttons to switch language.

**Balance test** (no browser needed) flies every mission many times and checks the scores:

```bash
node scripts/balance_test.js --lang en
```

## Project structure
| Path | Contents |
|---|---|
| `index.html`, `loader.js`, `intro.js` | Site entry, language/theme loader, opening video |
| `mission-game/` | Turkish game, the shared CSS, and assets: `vendor/`, `textures/`, `models/`, `media/` |
| `mission-game-en/` | English game (same code, English texts) |
| `js/data.js` | Missions, orbits, instruments, parts, rockets, glossary |
| `js/model.js` | Engineering model: mass, power, cost, data link, schedule, radiation |
| `js/sim.js` | Month-by-month flight simulation, events, scoring, lessons |
| `js/workshop.js`, `js/craft3d.js` | One-screen design workshop and the 3D spacecraft |
| `js/flight3d.js` | 3D launch and orbit views |
| `js/online.js` | Online team rooms (Firebase Realtime Database, anonymous sign-in) |
| `js/extras.js` | Real-mission comparison, sound effects, badges, mission card |
| `scripts/` | `build_site.py` (site build), `balance_test.js`, `make_assets.py` |

## NASA data and credits
- **Planet textures** (`mission-game/textures/`, resized copies):
  - Earth: Blue Marble Next Generation (NASA/GSFC SVS 3615, Reto Stöckli, NASA Earth Observatory).
  - Moon: LRO LROC WAC mosaic (NASA SVS 4720, CGI Moon Kit).
  - Mars: Viking (NASA/JPL-Caltech/USGS).
  - Jupiter and Europa: Voyager (NASA/JPL-Caltech/USGS), via NASA 3D Resources.
- **Rocket models** (`mission-game/models/`, NASA 3D Resources): Saturn V (NASA/Michael D. Carbajal) and Explorer Jupiter-C.
- **Real-mission figures** in the report are rounded public values from NASA mission pages. They are marked "~".
- **Libraries:**
  - Three.js r149 / r147 examples (MIT): GLTFLoader and the Sky shader (Preetham model).
  - Lucide icons v0.460.0 (ISC).
  - Atkinson Hyperlegible Next font (SIL OFL).
- NASA images are used under the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). **This project is not endorsed by NASA.**

## License
The project's own code is under the [MIT License](LICENSE). NASA images and models, third-party libraries and the opening video are not covered; they keep their own terms (see above).

## Use of AI
Most of the source code and the in-game texts were written with **Claude (Anthropic)**, an AI coding assistant, following the team's instructions. The team chose the idea and the rules and tested every change. Every hand-written source file starts with an `AI-assisted` comment. See [AI_USE.md](AI_USE.md) for details.
