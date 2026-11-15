# Space Apps 2026 — Project Submission Text

Copy each section into the matching field on the Space Apps project page. All fields must be in English.
Deadline: **Sunday, November 15, 11:59 p.m.** in your Local Event's time zone. Then click **"Submit for Judging"**.

---

## Project Name
Mission Architect

## High-Level Project Summary
Mission Architect is a free browser game for the "Space Mission Design Game" challenge. Players pick a real kind of NASA mission and build the spacecraft for it:
- an Earth wildfire watcher, a lunar ice hunter, a Mars climate orbiter, or a Europa ocean explorer;
- they choose the orbit, instruments, power, antenna, propulsion and rocket.

Five live gauges show the trade-offs: money, mass, power, data and science. Every pick appears at once on a 3D model of the spacecraft. Players then launch and fly the mission month by month, deal with surprise events, and get a score with plain-language lessons.

It teaches the real engineering behind missions without any prior knowledge, and it works on phones, in Turkish and English, alone or as an online team.

## Link to Project Demo
`[ADD: public YouTube / Google Drive link — video ≤ 30 s with English subtitles, or ≤ 7 slides in English]`

## Link to Final Project
https://mission-architect.github.io/?lang=en

Source code: https://github.com/mission-architect/mission-architect.github.io

## Detailed Project Description

### What it does
1. **Choose a mission.** There are four missions, from Beginner (Earth) to Expert (Europa). Each has its own budget, science goals and deadline.
2. **Design the spacecraft** in a one-screen workshop with four steps: Mission → Instruments → Spacecraft → Launch.
   - **Live gauges.** Money, mass, power, data and science update with every choice.
   - **Instant 3D model.** The spacecraft redraws itself as you choose: solar wings or a nuclear battery, dish size, engine type, and each instrument on the front panels.
   - **Safety checks.** The launch button stays locked until the design is valid, for example when the craft is too heavy for the rocket or no instruments are chosen. The game says why in one short sentence.
3. **Launch and fly.**
   - **3D launch.** The launch is shown in 3D, with real NASA rocket models, fire and smoke.
   - **Cruise and orbit.** The 2D cruise shows the transfer orbit. The 3D orbit view shows the craft circling a NASA-textured planet while data flows home.
   - **Events.** Surprise events (collision warnings, instrument faults, solar conjunction) ask the responsible team role to decide.
4. **Learn from the result.**
   - **Score.** Out of 1000: science, mission success, resource efficiency and team goals.
   - **Lessons.** Short, plain-language lessons explain what worked and what did not.
   - **Real missions.** A side-by-side table compares your craft with the real NASA mission behind each scenario: Landsat 8, LRO, MAVEN and Europa Clipper.
   - **Badges.** Twelve badges reward good engineering, such as finishing with budget left or succeeding on a small rocket.
   - **Sharing.** A share code lets friends open the same design.

### How it works
- **Physics.** A simplified but proportional model:
  - the rocket equation for fuel and Δv;
  - the inverse-square law for sunlight and radio links;
  - eclipse time, radiation, launch windows and a schedule.
- **Flight.** The month-by-month simulation uses a seeded random generator. Online team members therefore see exactly the same flight.
- **Team play.** There are four roles: Mission Manager, Spacecraft Engineer, Science Lead and Communications Lead.
  - Each role owns part of the design and has its own goal.
  - Everyone must approve before launch.
  - Online rooms add live sync and a protected chat.

### Benefits
- Students and the public see why real missions look the way they do: why Europa needs a nuclear battery, why a big dish matters at Mars, why mass drives cost.
- No install, no account and no download. It works offline after the first visit.
- It is designed for all ages:
  - readable font and short texts;
  - keyboard and screen-reader support;
  - reduced-motion support;
  - dark and light themes.

### What we hope to achieve
Teachers can run it in a class as a team exercise. Each group gets a mission and the groups compare their designs and scores. Next steps:
- a classroom competition room;
- side-by-side comparison with the real NASA mission that inspired each scenario.

### Tools and languages
- **Code.** HTML, CSS and JavaScript only. There is no build step.
- **Libraries.** Three.js (3D), Lucide icons and the Atkinson Hyperlegible font.
- **Services.** Firebase Realtime Database for online rooms; GitHub Pages for hosting.

## Use of Super Intelligence (SI)
Yes. Most of the source code and the in-game texts were written with Claude (Anthropic), an AI coding assistant, following the team's instructions.

The team chose the challenge and the idea, set the game rules and design, and tested and revised every change. The AI also helped tune the game balance by simulating flights.

It is disclosed in three places:
- every source file starts with an "AI-assisted" comment;
- the site has an `ai-assistance` meta tag;
- `AI_USE.md` in the repository gives the details.

No AI image, audio or video generator was used for game graphics. The spacecraft and scenes are drawn by code, and the planet textures and rocket models are NASA's. The narration voice in the demo video was generated with ElevenLabs (AI text-to-speech); the pictures are real screen recordings of the game. `[TEAM: add a line about the opening video if it was AI-generated.]`

## NASA Data
- **Planet textures**, used in the 3D views:
  - Earth: Blue Marble Next Generation (NASA/GSFC SVS 3615, Reto Stöckli, NASA Earth Observatory).
  - Moon: LRO LROC WAC color mosaic (NASA SVS 4720, CGI Moon Kit).
  - Mars: Viking imagery (NASA/JPL-Caltech/USGS, NASA 3D Resources).
  - Jupiter: Voyager imagery (NASA/JPL-Caltech, NASA 3D Resources).
  - Europa: Voyager mosaic (USGS/JPL-Caltech, NASA 3D Resources).
- **3D rocket models**, from NASA 3D Resources: Saturn V (NASA/Michael D. Carbajal) and Explorer Jupiter-C.
- **Mission design references.** The mission types, instruments, orbits and numbers are simplified from NASA mission concepts:
  - Earth-observing satellites in sun-synchronous orbit (Landsat-type);
  - lunar polar orbiters (LRO);
  - Mars climate orbiters (MAVEN/MRO-type);
  - the Europa Clipper flyby tour.

## Space Agency Partner Data and Other References
- **Three.js r149 / r147 examples** (MIT): https://threejs.org. GLTFLoader and the Sky shader (Preetham atmosphere model).
- **Lucide icons v0.460.0** (ISC): https://lucide.dev
- **Atkinson Hyperlegible Next font** (SIL OFL), via Google Fonts.
- **Firebase Realtime Database** (Google), for online team rooms.
- NASA images are used under the NASA Images and Media Usage Guidelines. This project is not endorsed by NASA.
- Full credits: `README.md` in the repository.
