---
title: How I Use AI — Notes from the Field
description: GPT is the best teacher I've ever had.
date: 2023-12-26
categories:
    - Tech
tags:
    - AI
---

### GPT — the greatest invention in history
Personal opinion. At least, as of right now.
My programming and CS chops have leveled up massively, and I really owe that to GPT, especially GPT-4. Yes, it's gone through many iterations and is far from where it started.

### The mainstream AIs
A quick rundown of the popular conversational LLMs right now, ordered by my recommendation:
1. **GPT-4** — strongest and most useful
2. **Claude 2** — up to 100k context
3. **New Bing** — built on GPT-4, free to use, good for search
4. **GPT-3.5** — cheap, mostly used for high-volume API calls
5. **Bard** — Google's offering, so-so. Upside: free
6. **iFlytek Spark (讯飞星火)** — decent. Upside: convenient if you're in China
7. **Baidu ERNIE Bot (百度文心一言)** — no comment
8. **Other miscellaneous ones** — with so many better options, why use junk?
9. **Local LLMs** — can be deployed locally, can be fine-tuned. Compared with using someone else's product, you have far more creative possibilities.

In actual use, GPT-4 is the most helpful for both work and life, and the best one to use. The downsides are that registration and subscription are annoying, and $20/month is pricey. But I can tell you with full confidence: it is *absolutely* worth every cent. Truly insane.
From here on, I'll only talk about GPT-4. Other products aren't worth discussing.

### What GPT-4 changed for me
There are a million articles online about how amazing GPT-4 is and how to use it. I'm not going to repeat any of that. I'll just talk about the biggest shifts for me personally.

#### A complete overhaul of how I learn and how I get things done
Traditionally, to write code or learn a new skill, you have to study the whole thing front-to-back, and only after enough projects, enough hitting walls, can you confidently say "yeah, I can handle this kind of problem."
The world's knowledge is an ocean — the more you learn, the more you realize you don't know. In one limited human life you can only ever master a tiny sliver. Especially in tech, innovation outpaces your ability to keep up.
Picture all knowledge and skills as a giant tree. Each module is a trunk — say, Python is one trunk; Python's syntax and libraries are the leaves on that trunk.
Normally, to write decent Python software, you have to internalize the trunk and most of the leaves.
Now here's the problem: Python, Go, C#, Java, JS, TS, C++, etc. — that's already a long list. Then there's everything Linux: nginx, ufw, vim, OpenVPN, and on and on. .NET land has another whole stack. That's before you get to algorithms, frameworks, design patterns, Docker, jump servers, and so on.
With this much, even a whole life only gets you mastery of one or two. Everything else, you have to pretend you didn't see.

**Human life is finite. We can't master that much.**

GPT-4 totally upends this. It can answer questions and crank out tons of code on demand. (Of course, your professional level still caps the ceiling.)
1. GPT-4 massively speeds up learning, especially looking things up and debugging.
2. GPT-4 acts like a junior who completes the work you direct. Your own ability sets the upper bound.
3. Plus a huge amount of miscellaneous work.

**GPT-4 is an extension of my ability — it handles the details.**

To stick with the tree metaphor: I learn the trunks and the big-picture frame myself. The leaves and details, GPT-4 fills in.
Walking every trunk *and* every leaf is too much for me. But touring all the trunks is easy. When I need a specific leaf, I tap GPT-4 to flesh it out.

**Cover as many trunks as possible. When a problem hits, lean on GPT-4 for the leaves.**

This completely overturns my old "learn it all first, then do it" methodology. Now, as long as I have a sense of all the trunks, I can ship something that's theoretically possible but whose details I don't yet know — and ship it fast.

A few examples:
1. **Building this blog.** In theory, set up a website, get a server. The details are massive — see [The Tech Behind My Blog](https://baohongjiang.com/p/%E6%88%91%E5%8D%9A%E5%AE%A2%E7%9A%84%E8%83%8C%E5%90%8E%E7%9A%84%E6%8A%80%E6%9C%AF%E5%8E%9F%E7%90%86/) (in Chinese). That much technical detail, even though I'd never done it before, was tractable because I knew the trunks; the leaves I learned from GPT-4.
2. **Building an AI WeChat public account.** From an idea, starting with one official OpenAI API example, then a secondary WeChat account driven by simulated PC WeChat clicks, step by step it grew. I really was clueless at the start. Eventually it had Midjourney, Stable Diffusion, GPT-3.5/4, New Bing, voice-recognition chat, a membership system, and more. Tons of system and technical details. I knew it was theoretically doable and had a vague plan; GPT-4 filled in the rest. By the way, the account was called **Xiao Hui Hen Zhi Hui (小慧很智慧)**. At its peak it had 4k+ subscribers. Costs got too high and I had limited bandwidth, so I stopped maintaining it.
3. **Building an AI chat website.** Started by forking an open-source vue3+express site from GitHub. Later I rewrote the backend in Python (FastAPI), with a database, account auth, etc. Eventually added WeChat Pay, SMS phone verification, and more. WeChat Pay especially is a beast — you also need an ICP-filed mainland China server and domain. But I knew it was possible, and I made it work in the end!
4. [Building a giant LAN over OpenVPN tunnels](https://baohongjiang.com/p/%E4%BD%BF%E7%94%A8openvpn%E9%80%9A%E8%BF%87%E9%9A%A7%E9%81%93%E6%9E%84%E5%BB%BA%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%9B%86%E7%BE%A4%E5%8A%A8%E6%80%81lan/)

There are many similar cases in everyday work and life. I'll stop listing.

**GPT-4 completely flips the old "learn-it-all-then-start" model. Now, if it's theoretically possible, I can move on it immediately and finish at terrifying speed.**

Of course, for highly complex, exploratory work, both GPT-4 and I are stuck. Like research-grade new algorithms, or a distributed system that handles tens of millions of concurrent connections.
But for most **tasks someone has already solved before**, with GPT-4 in the loop, I can do them fairly well.


As for specific tips and tricks — there's already a flood of those online, and a few sentences won't cover it. If you actually care, just go bang on it. If you can use it, the tricks come naturally as you go. If you can't, no amount of talk will help.
