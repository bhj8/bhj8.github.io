---
title: Building a Dynamic Multi-Server LAN over OpenVPN Tunnels
description: For cross-WAN LAN with a multi-server architecture.
date: 2023-12-14
categories:
    - Tech
tags:
    - Networking
---

### Disclaimer
This post is strictly about OpenVPN tunneling/forwarding. The use cases are LAN-style co-op acceleration and remote-office intranets. Nothing else.

### Background
Lately I've been playing co-op with friends — *Raft*, *Stardew Valley*, *Overcooked*, etc. Mainland Chinese ISPs use NAT extensively (especially China Mobile), so even when players are geographically close, P2P co-op is laggy, high-latency, and packet-lossy. Often you can't even join the lobby.
I have an earlier post about using *UsbEAm LAN Party* to build a LAN — once everyone's on a virtual LAN, you can play locally. Even when going through Steam's API for relays, most games will switch to LAN co-op.
So building a LAN gives a great speed-up to most P2P games! (This is also useful for remote-office intranets — fundamentally you're simulating a virtual LAN; whatever LAN-only feature you need, you have it.)

### Going deeper
Building a virtual LAN over OpenVPN is easy. If you need a primer, see my other post [One-click LAN deploy]({{< ref "post/LAN-party-fast-setup" >}}).
But I wanted to push it further. The LAN setups in that post all use a single server. Suppose you now need to play with friends in Hong Kong or Macau. Because cross-border routes differ, those friends might struggle to even reach your single server, and latency / loss will be brutal.
That made me ask: can I deploy multiple servers? One in mainland China for domestic users. One in Hong Kong for cross-border users. The two servers connected over a GIA premium line, both stitched into the same LAN.

### Implementation
Building a shared LAN across two-or-more servers is significantly harder than one. Good news: I figured it out. Approach:
**Server A** in Hangzhou (mainland): all users connecting to it get IPs in `10.251.0.0/16` and `10.250.0.0/16`.
**Server B** in Hong Kong: all users connecting to it get IPs in `10.249.0.0/16` and `10.248.0.0/16`.

Server B runs OpenVPN as a *client* and connects to Server A, getting the address `10.251.0.2`.
IP forwarding has to be enabled on both servers.

Routes on Server A:
Outbound: `10.249.0.0/16`, `10.248.0.0/16` → route via `10.251.0.2`.

Routes on Server B:
Outbound: `10.251.0.0/16`, `10.250.0.0/16` → route via `10.251.0.1` (Server A's intranet address).

The middle wiring is fiddly; you have to debug it piece by piece. Some Linux commands you'll use a lot:
- `route` — view the current routing table
- `ip a` — view all network interfaces
- `netstat -an` — view current network connections

Don't forget to `push` the route table to clients on both A and B's server configs.

End result: whether you connect to A or B, you're inside the same big `10.0.0.0/8`. Both sides can ping each other freely, and if clients use TUN mode you can even go further at L2 / link layer. I'll stop here.

### Notes
What if we make the problem harder — say, hundreds of servers building one giant intranet? How would you architect that?
The above only had Server B talking to Server A as a client. If we add Servers C, D, E… how do *they* talk?

Two basic options.
**Option 1**: pick one server as primary, the rest as secondary. All secondaries only talk to the primary, which forwards traffic between secondaries.
This is easy to configure but if the primary goes down everyone loses connection. Secondaries can't talk to each other directly; everything has to go through the primary, dramatically reducing network utilization. The cluster's network is bottlenecked on the primary's max throughput. Also, you'll see packets taking the long way round. So…
**Option 2**: every server talks pairwise with every other server, maintaining routing tables to form one giant mesh.
That has its own problem: each server has to keep connections open with every other server. As the count grows, this resource cost balloons. And the configuration is a nightmare — every server's route table is unique, every one has to be maintained. (You can script it, of course.)

Each has trade-offs; in real-world deployments you mix them. Within a region, one primary with several secondaries underneath. Across regions worldwide, primaries talk to each other and cascade. The "secondary" of an upper layer becomes the "primary" of the lower layer — recursive nesting.
I've never operated a cluster that big; my mental model is probably very primitive. But the core idea should be 80–90% on track. The real production setup is probably way more complex.

That said — for game devs, you usually shard by country anyway. Even ultra-high-concurrency Redis lives inside the data center's intranet. There may be the occasional cross-country sync, but most of the time you don't need this. From things like Cloudflare Tunnel though, you can see this kind of architecture *is* used in the wild.

I'll write a separate post sometime on ultra-high-concurrency Redis in games.
