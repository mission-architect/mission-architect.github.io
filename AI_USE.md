# Use of AI ("Super Intelligence") in Mission Architect

NASA Space Apps asks teams to state clearly where and how AI tools were used. This file is that statement.

## What the team did
- Chose the challenge and the idea: a game where players design a space mission, balance budget, mass, power and data, then fly it month by month.
- Decided the game rules, the four missions, the look and feel, and every feature change. The team tested each change and asked for revisions.

## What AI did
- **Code:** Most of the source code (HTML, CSS, JavaScript) was written by **Claude (Anthropic)**, an AI coding assistant, working from the team's instructions in Claude Code.
  - Every hand-written source file starts with the comment `AI-assisted: this file was written with the help of Claude (Anthropic)…`.
  - The site's `index.html` carries the meta tag `<meta name="ai-assistance" …>`.
- **Text:** In-game texts in Turkish and English were drafted with the same assistant, then shortened and simplified at the team's request.
- **Numbers:** The assistant tuned the game balance (budgets, scores) by simulating many flights. The team checked the results.

## What AI did not make
- **Planet textures:** these are NASA images (Blue Marble, LRO, Viking, Voyager).
- **3D rocket models:** these are from NASA 3D Resources (Saturn V, Explorer Jupiter-C).
  - Sources and credits for both are listed in `README.md`.
- **The spacecraft, launch scene and planet fallbacks:** these are drawn by the game's own code at run time. No image-generation model was used.
- **Third-party libraries:** Three.js, Lucide icons and the Atkinson Hyperlegible font are open-source. They are used under their own licenses.

## Images and video
- **Opening video** (`mission-game/media/acilis-ekrani.mp4`): *[TEAM TO CONFIRM: how it was made. If it was made with an AI video tool, the game shows a visible "AI-generated" label on it, and it must not contain NASA logos.]*
- **Demo video narration**: the voice in the 30-second demo video was generated with ElevenLabs (AI text-to-speech). The pictures in the demo are real screen recordings of the game.
- No other AI-generated images, audio or video are used.

## Not affiliated with NASA
This project uses NASA open data and resources under the NASA media usage guidelines. It is not endorsed by NASA.
