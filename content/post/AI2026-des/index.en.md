---
title: Standing in 2026 — The Next Stage of How I Use AI
subtitle: When the conversation itself becomes the bottleneck
description: From web chat, to Cursor, to Claude Code, to the next layer. Each layer is a productivity leap.
date: 2026-04-23
categories:
    - Tech
tags:
    - AI
---

## Foreword

Around this time last year I wrote [Standing in 2025 — Looking Back at AI, and Looking Forward](https://baohongjiang.com/p/%E7%AB%99%E5%9C%A82025%E5%B9%B4%E5%9B%9E%E9%A1%BE%E5%92%8C%E5%B1%95%E6%9C%9Bai/) (in Chinese). My take back then was: **AI is an amplifier — own the framework, hand the details to AI.**

A year on, that conclusion isn't *wrong*. It's just no longer enough.

Because "have AI handle the details" has itself splintered into multiple wildly different layers. The productivity gap between people stuck on different layers is widening fast.

And I've personally hit a new bottleneck. This post is me writing down how I see that bottleneck and what I think the next stage is.

## My five stages of using AI

A quick recap of how my own usage has evolved:

| Stage | Form | Representative | What I do |
|------|------|------|----------|
| L1 | Web chat | ChatGPT web | Paste question in, paste answer out |
| L2 | IDE plugin | GitHub Copilot | AI completes alongside me; I'm in the driver's seat |
| L3 | AI-native IDE | Cursor | AI edits multiple files; I review |
| L4 | Terminal-native agent | Claude Code | AI can touch my whole machine; I confirm via dialogue |
| L5 | ? | ? | ? |

The throughline is one thing: **AI's operating boundary keeps expanding, and humans are progressively freed from layer after layer of concrete operation.**

Each leap is an order-of-magnitude jump.

## The bottleneck: top experts can't get enough out of three Max 20x's; I can't even use up one Pro

I just bought Claude's Max 5x. The result: **I can't even fully use it.**

Meanwhile, some top developers publicly say they can't get enough capacity out of running three Max 20x accounts at the same time.

That contrast made me stop and think — same tools, why can they burn through ten times the compute? Experts this strong, even *they* don't have enough? Where's the actual gap? **How do I close it?**

Thinking it through, the answer is clear:

**I'm the bottleneck.**

For every task I'm still going back and forth with Claude Code:

- "Search for related code first before changing anything"
- "That approach isn't right, try a different angle"
- "Run the tests first"
- "Confirm before committing"

I'm running 3–5 Agents in parallel and my brain is already taxed. Human context-switching has a cost. Tops, you can manage 5–7.

It's a strange feeling — **I'm holding a rocket but I'm still shifting gears one at a time.**

## The next stage: from "operator" to "legislator"

How do you break this bottleneck?

After working through Anthropic's public docs, the workflow notes from Boris Cherny (the creator of Claude Code), and a bunch of heavy-user practices, my conclusion is:

**The next stage isn't "manage more Agents." It's that you stop personally managing Agents at all.**

That sounds abstract, but unpack it and it's very concrete:

| | L4 (where I am) | L5 (next stage) |
|---|---|---|
| Am I in the loop? | Yes | No |
| What do I do? | Talk, confirm, correct | Write rules, define acceptance, arbitrate |
| When does AI stop? | When I say stop | When the rule says it's done |
| If I leave the keyboard for 8 hours | The system halts, waiting for me | The system has been making progress for 8 hours |

**The single test for L5: when you walk away from the keyboard for 8 hours and come back, has the system stopped waiting for you, or has it already finished its run?**

In L5, the focus of your work fundamentally changes:

- Write **specs**, not prompts
- Define acceptance criteria (tests, lint, human-review checkpoints), don't review every step
- Design **hooks and guardrails**, not confirmation buttons
- Build a **feedback loop** (failures auto-feed back to the AI to keep iterating), don't manually retry

You open your laptop in the morning, and what you see is no longer "Claude is waiting on me to approve something." It's: **"Out of last night's 12 PRs, 9 already passed automated acceptance, 3 are flagged red for me to judge."**

The only thing you do: **look at those 3 reds, and patch the rule that let them turn red.**

## I'm already crawling toward it: what L4.5 actually feels like

L5 sounds far off, but my L4 has actually been transitioning into L4.5.

The feeling is already different. Claude Code can run remotely, run in the background; I'm not staring at every line it writes. Most of my day is spent **looking at the reports it hands me**, then doing a few things:

- Judge whether the direction is right
- Decide: keep going, switch approach, or send it back to redo
- Make calls and decisions at key checkpoints
- Handle whatever it can't crack and gets stuck on

**Honestly, I'm now more like a remote-control manager than a programmer.**

I didn't write the code, but **I set the direction, I drew the boundaries, I judged the quality**. It's a strange state — the rhythm has changed completely. I get a noticeably larger amount done in a day, but every individual decision carries far more weight. One bad direction can torch hours of downstream output.

This still isn't L5. L5 is when even the "look at the reports" step is partly handed off — the rules auto-filter 80% of the content, and I only look at the remaining 20%. But this transition state, L4.5, is already enough to make me feel it: **managing AI feels nothing like writing code yourself. They are two completely different jobs.**

## The productivity gap is widening

This is the thing I most want to call out: **the productivity gap between people stuck on different stages is widening at an order-of-magnitude rate.**

- **L1** people use AI to answer questions and look stuff up. Limited gains, but real.
- **L2 / L3** people fold AI into their code-editing flow. Multiple times more efficient than L1.
- **L4** people get AI to run and complete a whole task autonomously. Multiple times more efficient again.
- **L5** people have a dozen tasks running in parallel and only do arbitration and legislation. Another order of magnitude on top.

The thresholds between these layers aren't linear. L1 → L2 is easy: install a plugin. L4 → L5 is *very* hard — it requires you to redesign the entire shape of your work. **You stop being "the person using the tool" and become "the person designing the rules for using the tool."**

## What it asks of you: both knowledge density *and* total knowledge

Here's the most counter-intuitive part.

A lot of people assume the AI era lowers the bar — "AI handles details, I just need a sketch."

**Wrong. The exact opposite.**

The AI era **raises** the bar — and on **two axes at once**:

**Total knowledge — you need to know more.** Judging direction, drawing boundaries, arbitrating: every one of those decisions stands on actually understanding the domain. If you only know a tech stack at a surface level, you literally cannot tell that the code AI wrote is bad.

**Knowledge density — your judgments per unit time must be higher and sharper.** In L5, your day looks like:

- 10 minutes reading a PR summary, decide whether to merge
- 5 minutes reading a failure report, decide whether to fix code or fix the rule
- 20 minutes writing a spec that defines a feature's acceptance edges
- 30 minutes reviewing a new rule, judging whether it'll friendly-fire other tasks

**Every action is a decision; nothing is "execution."**

In less time you have to make more decisions, more accurately: see at a glance where the AI will derail; while writing the spec, predict where the boundary will explode; the moment you see a new rule, know what it'll friendly-fire.

These are exactly the abilities AI cannot replace. Because at their core they're **experience + taste + judgment**, not information processing.

---

My read: **second half of this year through the first half of next year**, the first genuinely native L5 product will land — possibly Anthropic itself, possibly a third party on top of the Claude API. By that point, the gap between people will be wider still.
