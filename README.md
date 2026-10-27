# EduVerse 3D AI Academy (in progress)

DEMO MODE: data lives in server memory and resets on restart. Sign-in is a demo picker, not real authentication.

## Run (Windows, macOS, Linux)
1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. `npm run setup`
4. `npm run dev`
5. Open http://localhost:3000 (if that port is busy: `npm run dev -- -p 3100`, then open http://localhost:3100)

## Try it
- Pick "Student: Nova-7".
- Open Mathematics > Trigonometry, or Physics > Kinematics.
- Read every section, finish the simulation, take the test (pass mark 80%), rate the topic. The next topic unlocks.

## Checks
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`

## What is built so far
Progression engine, Trigonometry and Kinematics lessons, unit circle and projectile simulations, graded tests, ratings.
Not built yet: 3D scenes, Chemistry and Biology, AI tutor, analytics, teacher/guardian/admin portals, Supabase adapter.
