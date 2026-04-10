# reviewapp — project context for Claude Code

This file is auto-loaded at the start of every session. Read it before
doing anything in this project.

## Memory layer

This project has a structured memory layer in `memory/`:

- **`memory/recent-memory.md`** — rolling 48h context. Inlined below
  so you have it without an extra file read. Always considered fresh.
- **`memory/long-term-memory.md`** — distilled facts, preferences, and
  patterns. Read on demand when you need durable context. Path:
  `/Users/sourabhrajdev/Desktop/reviewapp/memory/long-term-memory.md`
- **`memory/project-memory.md`** — current project state snapshot.
  Read on demand when you need to get oriented quickly. Path:
  `/Users/sourabhrajdev/Desktop/reviewapp/memory/project-memory.md`

The `consolidate-memory` skill (at
`~/.claude/skills/consolidate-memory/SKILL.md`) is scheduled to run
nightly via the harness cron and keeps these files current.

## How to use this memory layer

1. **At session start**, the inlined `recent-memory.md` block below
   gives you the last 48h of decisions, observations, and open
   threads. Trust it as the most current context.
2. **Before suggesting an architectural change** or making any
   non-trivial decision, also read `memory/long-term-memory.md` to
   check for durable preferences or "never do this" rules.
3. **When asked "what's the state of the project"**, read
   `memory/project-memory.md` first — that's the freshest snapshot
   of files, stack, and open work.
4. **When you learn something new** that the consolidator will want
   to capture later, just keep working — the nightly run will pick
   it up from the conversation log. Don't manually edit memory
   files unless the user explicitly asks.

---

## Inlined: memory/recent-memory.md

<!-- consolidate-memory regenerates the block below from the live file. -->
<!-- BEGIN recent-memory -->

# Recent Memory — Rolling 48 Hours

> Auto-managed by `consolidate-memory` skill. Items older than 48 hours are
> either promoted to `long-term-memory.md` (if they reflect stable patterns
> or preferences) or pruned. Manual edits are preserved across runs as long
> as they sit under the **Manual notes** section at the bottom.

_Last consolidated: never_

## Recent decisions
- **2026-04-08** — Switched the AI provider from Anthropic Claude to Google
  Gemini Flash 2.5 (`gemini-2.5-flash`) via direct REST call. Disabled
  thinking tokens (`thinkingBudget: 0`) and bumped `maxOutputTokens` to 400
  because 2.5 Flash counts thinking against the visible-output budget and
  the spec's 300-token cap was truncating the review.
- **2026-04-08** — Split the personalization step from one stacked screen
  into three single-question screens (visit type → occasion → menu) with
  auto-advance on single-select chips and a back chevron in the header.
  Reason: user explicitly requested "1 question per page" with screenshot.

## Recent observations
- Gemini Flash 2.5 sometimes leaks the raw bowling pin count into the
  review prose ("My experience was an 8 out of 10"). The spec system
  prompt asks the model to use the score for *tone calibration* only —
  Gemini interprets this more literally than Claude does. Candidate fix:
  add a "never mention numeric scores" rule to the prompt's RULES block.

## Open threads
- User pasted GitHub repo `tirth8205/code-review-graph` and a screenshot
  of its pip install commands. Purpose unclear — awaiting clarification.
- User dropped a full premium-redesign spec (React + Vite + TS +
  Three.js + Framer Motion + GSAP, Apple-minimal design language,
  archery / slide-bowling / 3-hole putt). Unclear whether this is a
  rip-and-replace of the current vanilla JS app or a parallel premium
  track. Awaiting scope confirmation.

## Manual notes
<!-- Anything below this line is preserved verbatim by the consolidator. -->

<!-- END recent-memory -->
