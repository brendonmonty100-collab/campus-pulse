# CampusPulse — Anonymous Feedback & Sentiment Tracker

An anonymous feedback board where students report how they feel about
different aspects of campus life. Unlike a plain list, the app aggregates
submissions to surface which category has the most unresolved negative
feedback. Built for CCA 2 (Cloud Computing and DevOps).

## Features

- Home page showing live sentiment breakdown per category, generated server-side
- Anonymous feedback form: category, mood (Good / Okay / Bad), message — validated server-side
- "Mark Addressed" action that updates an entry's status and removes it from the unresolved count
- Category filter across the feed
- `/api/feedback` — JSON API of all feedback
- `/health` — health check endpoint used by the pipeline and by Render
- Footer showing the live commit ID (`RENDER_GIT_COMMIT`)

## Tech stack

Node.js 22 + Express, `node:test` for automated tests, ESLint for linting,
Docker for packaging, GitHub Actions for CI/CD, Render for hosting.

## Run it locally

```bash
npm install
npm test          # run the automated tests
npm run lint       # check code style
npm start           # open http://localhost:3000
```

## Run it in Docker

```bash
docker build -t campus-pulse .
docker run -p 3000:3000 campus-pulse
```

## Pipeline diagram

```
Git push --> Lint & Test --> Docker Build + Smoke Test --> Deploy (main only) --> Live site
                                                                                 (Render)
```

- **Lint & Test** — runs on every push and pull request
- **Docker Build + Smoke Test** — builds the image and hits `/health` inside the container
- **Deploy** — only runs on pushes to `main`, and only if the previous two jobs passed
  (`needs: test`, `needs: build`), so a failing test blocks deployment automatically

## Project structure

```
campus-pulse/
├── .github/workflows/ci-cd.yml
├── test/app.test.js
├── app.js
├── server.js
├── Dockerfile
├── .eslintrc.json
├── .gitignore
├── package.json
└── README.md
```
