# Card Kalaa

A programmatic animated-invitation-card renderer for the Indian market.
Users will eventually customise a card on a Next.js site, preview it in the browser,
and download a rendered MP4. This repo is currently a **skeleton only** — no card
content exists yet. The purpose of this file is to help future Claude sessions (and
future you) understand the architecture without re-reading every file.

---

## What This Project Does

- Hosts a Next.js app (future editor + download flow)
- Houses Remotion compositions that render animated invitation cards as MP4
- Separates every animation into **individual frame components** so each frame
  can be edited in isolation without touching the rest of the card
- Drives all colours, timings, and metadata from **per-card config files**, so
  a single card can support multiple themes without any component-level changes

## What This Project Does NOT Do (yet)

- No real card designs, illustrations, or copy
- No editor UI, no download flow, no payments
- No backend, no database, no auth
- No API routes

---

## Tech Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS
- Remotion (`remotion`, `@remotion/player`, `@remotion/cli`)
- No state library, no server actions, no ORM

---

## Repo Structure
