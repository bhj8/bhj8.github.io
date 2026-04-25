---
title: The Tech Behind My Blog
description: A carefully considered setup that's fast worldwide, with extra optimization for mainland China.
date: 2023-12-13
categories:
    - Tech
tags:
    - Networking
    - Blog Tech
---

### Problems I needed the blog to solve
Before building the blog, I had a few requirements:
1. Pick a simple, general-purpose blog framework — and one that looks good.
2. Full feature set: comments, etc.
3. Bullet-proof against attacks, especially DDoS.
4. Optimized for mainland-China network conditions — fast access from inside China too.
5. No ICP filing — even though there's no problematic content, I just don't want the hassle.

### Full breakdown of the tech

The blog framework is Hugo (Go), with a sharp-looking theme.
The site is fully hosted on GitHub Pages; the backend is a GitHub Codespace where I write remotely with VS Code. GitHub Actions auto-deploys on push, so a new post is live in about 10 seconds.
On Cloudflare I bought 10 years of `baohongjiang.com` and pointed it at GitHub Pages. Visit `baohongjiang.com` and you're at the blog. Everything is HTTPS-encrypted end to end.
Traffic analytics use Google Analytics and Cloudflare in parallel, so I have accurate visitor metrics.
Comments are managed via Disqus — for well-known reasons, comments are not visible or postable from inside mainland China.

At this point the blog is full-featured and fast. The site is essentially static, so backend attacks aren't a thing. And because the site is hosted on GitHub Pages and proxied through Cloudflare, a DDoS attack would have to first break Cloudflare and *then* take down GitHub before it could even touch my blog. Roughly speaking, you'd need tens of terabits per second to be able to hurt me. I kind of wish my blog were big enough to be worth that kind of attack. Haha.

Now, for well-known reasons, although mainland China can reach the site fine and the speed is OK, latency is over 200ms and packet loss is bad. So I had to specifically optimize for mainland China.
Cloudflare does have geo load-balancing, but it's enterprise-only and *expensive*. So I bought `baohongjiang.cn`, ran a bunch of tests, and picked the best Hong Kong GIA-line VPS I could find for nginx reverse-proxying.
When you visit `baohongjiang.cn`, you're really hitting the GIA-line VPS, which then fetches my site. Latency from mainland Chinese ISPs drops to around 30ms with very low packet loss. It flies.

The full request path:
user → baohongjiang.cn → Hong Kong VPS → baohongjiang.com → Cloudflare → GitHub Pages (origin)

`baohongjiang.com` is the rock-solid international entry point. `baohongjiang.cn` is the mainland-China fast lane.


This setup is *not* the cheapest possible — straight GitHub Pages costs you nothing. But I just wanted to flex.
