---
title: A Go-based Excel-to-CSV Exporter — 60× Faster Than the Python One
date: 2023-10-31
description: Go's super-efficient multi-core/multi-thread performance makes the speed jump huge.
---

#### License notice
MIT.
This post discusses a generic table-export tool used in game development; it's not tied to any specific project. The trigger was the painfully slow Python exporter we used at work, but I wrote this code in my own time, at home. I gave the tool to my workplace project to use, to lift the team's efficiency.
So this tool is not under any NDA, not tied to any organization. Personally owned.
The source is now open so anyone can use it.

## Background and approach
Most game studios use Excel as their config data format. Game programs obviously can't read Excel directly, so there's usually an "exporter" written by an old-school programmer — typically Python, because the env is convenient and writing CLI tools in Python is nice. Especially for tooling.
But as everyone knows, Python has the GIL — no matter how good your code is, you're stuck on a single core. As game configs grow, even a small tweak can cost minutes to re-export. Just unbearable.

I had a flash of inspiration: writing the exporter in Go would be beautiful. Goroutines give you crazy concurrency on multiple cores, plus Go's structs are all value types — double speedup! (Yes, C++ would be faster, but it's hard to write well, especially under heavy concurrency. Hand-rolling it, I'm not even sure I'd beat Go, and Go is safer. Also, I'm not really a C++ guy 😉😉😉.)

### End result
TL;DR: nearly **60× faster**. From a few minutes down to about 3 seconds. I have reason to suspect the bottleneck now is disk read speed rather than CPU. A faster SSD would help, but 3 seconds is already so fast that further optimization isn't worth it.

## Downloads

#### Required

[Config file](/downloads/go-excel2csv/config.xml)
Before running, you have to configure the export directory and the English name. Required. Place it in the same directory as the Go binary.

#### Pick one of the following

[Go source](/downloads/go-excel2csv/excel2CSV.go)
You'll need to set up Go and configure the libraries it depends on.

[Standalone .exe (recommended)](/downloads/go-excel2csv/excel2csv.exe)
Double-click and go. But because the tool reads/writes files and uses system libraries, antivirus may flag it. Use your own judgement.
