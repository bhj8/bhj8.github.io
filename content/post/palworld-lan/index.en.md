---
title: Palworld Co-op Guide for the Pirated Build
description: Got money? Buy it. No money? Bring your friends.
date: 2024-01-30
categories:
    - Gaming
tags:
    - Tutorials
---

Palworld is hot right now, so of course me and my friends had to jump in.

#### Disclaimer
I've always supported genuine copies — I have an Xbox Game Pass subscription so I can play Palworld for free, and I own close to a thousand games across Steam, Epic, etc. It's just that some of my friends haven't tried it, and with mortgages and car loans they're frugal. I'll get them on the train first; later I'll talk them into actually paying for a copy.


When you do something, the most important thing is knowing whether it can actually work. Let me just tell you up front:
The pirated build of Palworld can absolutely be played in co-op. No issues at all.

### Step 1: Download the pirated build of Palworld and install the co-op patch
Figure this out yourself; if you can't get past this you can stop reading — even reading on, you wouldn't be able to follow.
For the co-op patch, set it to LAN co-op mode.

### Step 2: On the host, install steamCmd, download the Palworld dedicated server files, and bring up the server.
[Official server-hosting guide](https://developer.valvesoftware.com/wiki/SteamCMD#Windows)
Follow the guide to install steamcmd, download the Palworld server files, and start the server. After it's up, you'll see a string of English output showing the AppID.

### Step 3: Co-op and acceleration

If you're hosting on a cloud server, you can skip the steps below — just open port 8211 in the cloud security group.


**Option 1**: Port-forwarding so other players can reach the host directly. Only works if you have a public IP.
Configure port forwarding for port 8211 on your router and modem.

**Option 2**: LAN acceleration (recommended)
[LAN acceleration deploy]({{< ref "post/LAN-party-fast-setup" >}})
Use a virtual LAN to play and accelerate. Because the relay server is right next door, latency drops to under 20ms.
When connecting, use the LAN IP.


Those are the core steps. If you don't want to mess around, just buy the game.
