---
title: SSD vs RamDisk
date: 2023-11-17
description: Chasing the ceiling of disk speed.
math: true
---

During the 6.18 sale this year I built a beast PC: 13900K + 4090, both CPU and GPU on water. With a beast like this, you naturally want to push every spec. This post is about pushing disk speed to the limit.
A small flex first: domestic (China) YMTC NAND really delivers. SSD prices have come down hard.

OK, to the point.

## Chasing the ceiling of disk speed
After a lot of research I went with RAID 0 — and conveniently, my motherboard supports it. (The drive is mostly games and code, and code is on GitHub. There's data-loss risk, but I can live with it. More on that later.)
I bought YMTC's "Fanxiang" SSDs, each rated at up to 7500 MB/s read/write.
I put two in a RAID 0. The result:

![SSD](SSD.png)

Sequential reads/writes top out around ~12000 MB/s — that's 12 GB/s! At that speed everything feels great!
Allowing for the typical "1+1<2" overhead of RAID 0, that tracks.

Memory speed is well-known to be very fast — typically tens of GB/s. I've got a *lot* of memory, 32G × 2 at 4800MHz, and on a normal day I don't even use half. So I had a thought: maybe I should try a RAM disk and benchmark it.

![RamDisk](RamDisk.png)

Top-end sequential read/write is very high, but the gap vs. the SSD isn't huge. Add another SSD to the RAID 0 and 3 SSDs would beat the RAM disk on raw sequential.

But look closer — the RAM disk's random 4K is *way* faster than the SSD. At rnd4k Q1T1 it's 10× faster!
Random 4K is the workload that actually shows you everyday speed.

Why is random 4K so much faster?
Memory is built for massive addressing; SSD controllers are way slower.

Notice another thing here: memory latency is *much* lower than the SSD's. rnd4k Q1T1 vs rnd4k Q32T1 — Q is concurrency. At Q1T1 there's only one process; the next op can't proceed until the previous one finishes.
We see that the SSD's latency is high and the RAM disk's is low.
SSD average latency:
$$1/(73.22 \times 1000 / 4) \approx 0.054\ \text{ms}$$
RAM disk average latency:
$$1/(695 \times 1000 / 4) \approx 0.0057\ \text{ms}$$

These match what hardware fundamentals would tell you.
So the RAM disk is genuinely much faster at random 4K, and SSDs are unlikely to ever close that latency floor.

### Conclusion
SSD and RAM disk sequential read/write are not far apart. With RAID, the SSD even pulls ahead.
The RAM disk's 4K random read/write is far ahead of any SSD, because RAM latency is an order of magnitude lower than NAND. That makes single-threaded 4K 10× faster on a RAM disk! But at the *limits* of 4K, the gap with RAID-stacked SSDs gets small enough that adding more SSDs to the RAID can simply close it.

But memory is dramatically more expensive than SSD: a 2T domestic SSD is 500-something RMB; 32G of RAM is 1500+ RMB.
Unless you have a workload that's actually latency-sensitive in a serious way, I just recommend SSDs in RAID across the board.

### About other databases and Redis
Database bottlenecks are usually 4K read/write. For a long stretch of history, we used spinning disks where peak sequential was a few tens of MB/s — hundreds of times slower than RAM.
Redis basically moves the database into RAM to get extreme 4K performance. That's why high-concurrency services lean on Redis, syncing to disk databases on a schedule.

But, my friend, times have changed. From my testing, you can see: a RAID of SSDs is *also* very strong. (Of course, I was testing a RAM disk, not pure RAM. There's a real multiplicative loss there.)
RAID also gives you rich backup arrays with redundancy. Pricing is reasonable. Plus, Redis costs real human time and effort to learn and operate.

Granted, Redis still wins on concurrency over a traditional disk-based DB. But honestly, in our line of work — game development — for normal cases a regular disk DB is plenty. SSDs handle thousands or even tens of thousands of concurrent connections fine. (If you're hitting hundreds of thousands, your business is making bank and will have a real backend team.) Spend a few thousand RMB, buy several SSDs, build a fast RAID 10 with double redundancy. Combine with periodic cold and hot backups. Low cost, high concurrency.

Also, RAM disks aren't super useful in everyday life, so RAM-disk software is genuinely hard to find these days. Hhh.
