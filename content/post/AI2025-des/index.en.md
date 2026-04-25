---
title: Standing in 2025 — Looking Back at AI, and Looking Forward
description: The singularity is inevitable. Tech is exploding exponentially.
date: 2025-03-12
categories:
    - Tech
tags:
    - AI
---

Foreword:
It's now 2025, and AI is white-hot. In this post I want to share my personal take on AI — what I understand, what I expect, and how it's helping my career and life.

## Looking at the present from the past, and predicting the future from now.
### An article from January 2015 that predicted today's AI
On **January 27, 2015**, an article was published that completely upended my view of AI. Here's the (Chinese-translated) link:
[Artificial Intelligence may very well lead to humanity's immortality or extinction — and it's quite possible all of this will happen within our lifetimes](https://zhuanlan.zhihu.com/p/19950456) (in Chinese)
If you're interested, please read the whole thing! I strongly recommend it!
In this post I'll just lift two of its conclusions:
1. Human technological progress is exponential!
{{< img src="image.png" alt="alt text" width="500" >}}

2. AI's growth could leap past human cognition in an instant!
{{< img src="image-1.png" alt="alt text" width="500" >}}


At the time, most people would have called this nonsense. After all, in January 2015 OpenAI didn't even exist. Look at the timeline:
```
2015 — OpenAI founded, focused on AGI.
2016 — AlphaGo beats Lee Sedol; AI surpasses humans at Go.
2017 — Transformers (Google) ignite the NLP revolution and become the foundation for GPT, BERT, etc.
2019 — GPT-2 (OpenAI) released, showing strong text generation.
2020 — GPT-3 (175B parameters) released, kicking off the AIGC craze.
2022 — ChatGPT (GPT-3.5) released and instantly explodes.
2023 — GPT-4 released, far more capable, multimodal (text + images).
2023 onward — AI products everywhere.
```

If you read that article, you should be a little stunned right now. Its predictions are almost spot on — incredibly forward-looking!
**Ten years ago, when the internet had only just gone mainstream and most people had only just gotten a smartphone, the author already predicted, accurately, where AI would be a decade later.**
Once again, I strongly recommend everyone who hasn't read it go read it.

History has confirmed the article's accuracy. So let's see what that 2015 article predicted for *after* 2025.
{{< img src="image-2.png" alt="alt text" width="500" >}}
The article splits AI into three stages: Artificial Narrow Intelligence (ANI), Artificial General Intelligence (AGI), and Artificial Super Intelligence (ASI). I think we'd all agree that as humans, we've now reached AGI.

My personal take:
1. The moment ASI arrives, its intelligence will, in an instant, dwarf the sum of all human intelligence — growing at unbelievable, absurd exponential rates. Humanity is therefore extinguished, or made immortal.
2. The most optimistic estimate: ASI in 2030. Conservative: 2050. Pessimistic: 2080, or never.


All of today's AI is essentially modeled on the human brain. Look at this from a compute angle:
```
As of 2024, the world's fastest supercomputer (e.g. Frontier) has reached 1.2 EFLOPS (1.2 × 10¹⁸ FLOPS).
Because the human brain doesn't run like a computer, direct comparisons are hard, but typical estimates put it at 1 EFLOPS to 100 EFLOPS (10¹⁸ to 10²⁰ FLOPS).
```
You can see, today's strongest compute is approaching the brain. I've always believed: when computer compute exceeds the brain, intelligence will get very close to the brain too. And right now something like o3 (whose compute is still nowhere near a brain) is already far past the vast majority of humans. So what about the future? What happens as compute keeps growing?

In short: I think AI intelligence will continue to compound exponentially, just as that article predicted, possibly all the way to AGI and beyond.

### An article I wrote in December 2023 about how I understand and use AI
Back in the GPT-3 era I'd already started using AI heavily. GPT-4's arrival especially gave my technical chops, vision, and thinking a quantum leap.
Original (in Chinese): [How I Use AI — Notes from the Field](https://baohongjiang.com/p/ai%E4%BD%BF%E7%94%A8%E5%BF%83%E5%BE%97/)
Now, with even more, even stronger AI products around, my hands-on ability has grown massively, and I'm even more convinced that what I wrote then was correct.
That's exactly what the next section is about.

## How AI completely flips the way I solve problems and think about them.
Let me re-quote my own conclusion:
**Human life is finite. We can't master that much knowledge or that many skills.
AI overturns the traditional learn-then-execute pipeline: master the framework, leave the details to AI, and your efficiency and ceiling go way up.**

Some specific points:
```
### AI completely changes how we learn knowledge and master skills
The traditional model demands you internalize a full system; AI fills in the specific details and dramatically speeds up learning.
You only need to grasp the "trunks" of the knowledge tree; AI fills in the "leaves."

### AI accelerates execution — going from learning to shipping is way faster
Projects that previously required full mastery before you could start can now be moved forward as long as you know it's broadly feasible — AI handles the rest.
Examples: building a blog, an AI WeChat public account, an AI chat website — all started as a concept, then AI fleshed out the details and got it shipped.

### AI is an efficient executor, but the ceiling is still set by you
AI helps with problems that already have mature solutions, but on frontier exploratory problems it still struggles.
Your own ability and depth of thought decide the final outcome — AI is just an amplifier.

### Practice is everything; the best way to use AI is "do it with your hands"
Real growth comes from actually doing it. The tricks come naturally as you go.
"Use it if you can, just dive in" — far more important than talking about technique.
```

For me personally, AI now touches **80%+** of what I do, work and dev included.
DeepSeek R1's reasoning ability can attack a problem from every angle. Its breadth and knowledge far exceed mine. If one day I genuinely learn that kind of structured thinking, I can't even imagine the result.
As I said: practice is everything. Use it deeply, you'll get it. Without using it, talk is moonlight on water — useless.

## Roundup of AI products as of today
As of writing, March 12, 2025, here's my summary of the popular AIs out there, including ones I've personally used. Their characteristics, pros and cons. Includes more than just LLMs. For your reference:

1. LLMs
    - GPT family
        - **o3, o1** — currently the strongest *and* the most expensive reasoning models. Massive context (o1 = 200K), the strongest reasoning and logic right now. Especially good at code analysis and logic. I only call this big brother in when its little siblings can't solve a problem.
        - **o1-mini, o3-mini, o3-mini-high** — mini versions with better speed and price/performance trade-offs. For hard code problems, I usually try them first.
        - **4o** — the multimodal one. Well-rounded, fast. Reads images directly, parses audio. Speed and price are excellent. My most-used model right now.
        - **4.5** — newest GPT, way better creativity and "humanness," but seriously expensive. I save it for creative work and copy.
        - Other GPT models — all weaker siblings; the only upside is a slightly cheaper price. Not worth discussing.
    - DeepSeek family
        - **R1** — currently the strongest Chinese-language reasoning model and a price/performance monster. You've all seen how strong it is. Cheap, especially good at very Chinese-flavored reasoning problems. Heads up: its coding ability is weaker than other models — really, don't use it for code. I use it for problems with strong Chinese-language texture. Very grounded.
        - **V3** — non-reasoning version. I rarely use it.
        - Other parameter sizes — DeepSeek's strength is hitting GPT-4o-class performance with the lowest compute and hardware. A lot of websites sneakily pass off 32B / 70B versions as the full 671B. I'm calling it out because **R1 32B 4-bit quantized** is the best model you can run locally on a 4090 24G consumer GPU. From experience, useful for things involving confidentiality.
    - Claude family
        - **Claude 3.7** — multiple variants; the everyday one is Sonnet. Currently the second-best after GPT. Very humane to use; many heavy users say its coding ability beats GPT-4o. Great UX — they pioneered Canvas, and GitHub Copilot put it in their membership, which says a lot about its code price/performance. I use it to cross-check GPT's code.
    - Grok family
        - **Grok 3** — Musk's AI. Reportedly uses the most reasoning compute of anyone right now. In code it doesn't have an obvious edge over the others. Worth noting: its content moderation is extremely loose.
    - Gemini family
        - **Gemini 2.0** — Google's. Thanks to Google's infrastructure muscle, very fast. Natively multimodal. Search ability clearly beats other models. (Of course — Google!) I don't use it much; intelligence-wise it's not clearly ahead.
    - Other / local models
        - On Hugging Face there's a flood of models, plus QwQ from China and others — each with their own strengths. Most are smaller, specialized for a specific domain. With limited bandwidth, I generally don't bother.
    - Manus
        - From all the noise, this is hype and a scam. Once people actually use it, we'll see if it's gold.
2. AI image generation
    - **Stable Diffusion** — the famous SD. Open source, deeply customizable. Different base models = different styles. Tons of plugins. Easy to deploy and run on a home PC. Downsides: output is fully tied to the base model, and the learning curve is steep.
    - **Midjourney** — also famous (MJ). Very strong, only available as a service. Wide range of styles. Downsides: little customization, expensive. The polar opposite of SD.
    - **DALL·E 3** — way behind the above two. The only upside is integration into the native ChatGPT web. Not really useful.
3. TTS (text-to-speech)
    - **VITS family**
        - VITS was originally released by a Chinese developer; lots of forks and downstream work. Currently the strongest open-source one is GPT-SoVITS. With just a few minutes of source audio, it can produce highly similar multilingual speech. A home PC is enough to fine-tune and infer.
        Some "do it with your hands" results from me:
        Inferred version of my own voice
        {{< audio src="my_AI.wav" >}}
        WW2 commentary, original voice
        {{< audio src="ww2Start.wav" >}}
        WW2 commentary, AI-synthesized
        {{< audio src="ww2Start_AI.wav" >}}
    - Other vendors — Microsoft TTS, Google TTS, Douyin, all closed-source. Custom fine-tuning is expensive; otherwise you're stuck with their pretrained voices. That said, the out-of-the-box quality is already excellent!
4. STT (speech-to-text)
    - **Whisper** — OpenAI's open-source model, supports 100+ languages. Currently the strongest open-source STT. Runs locally on a home PC.
    - Others — Microsoft, Google, iFlytek, etc., all have plenty of APIs.
5. Other
    - **Suno** — AI music generation, sounds good, but practical use is still weak. Future looks promising.
    - **Sora** — video synthesis is everywhere now, but most output looks weird. Another path is heavily customized SD with image stitching for video. Both are being explored.

1. Combo / tooling
    - **GitHub Copilot** — strongly recommended. Microsoft's flagship. Deeply integrated into IDEs, especially VS Code and Visual Studio. Free tier exists, paid is $10/month. Wraps GPT, Claude, and Gemini. Once it sees your IDE context, it's incredibly convenient.
    - **Cursor** — an AI-first IDE built on VS Code, neck-and-neck with Copilot. Also very convenient. But because it's an IDE rather than a plugin, you give up some flexibility.
    - **Poe** — an aggregator over multiple AIs; basically a wrapper frontend that calls each vendor's API. Pros: one-stop access, some free quota. Cons: API calls usually fall short of native vendor sites in features and quality.

## My personal outlook on the future of AI

I think AI has already permanently changed how I think and how I solve problems.
~~Of course, if ASI shows up and humanity gets wiped out, none of this matters. So our default assumption has to be that AI carries us up the next tech tier.~~
In this era you have to keep up, keep leveling up, keep absorbing new knowledge.
**The only constant in the world is change itself.**
After watching the inflated boom in the China market, I've concluded: AI on its own doesn't generate huge value the way some prior technologies did. It only produces magic when combined with another field.
Like internet dev, traditional retail, traditional manufacturing, literature & film, education, etc.

Either way, we should all think like founders. Letting AI fill in the details and do the grunt work for you is the right move. Build out your own knowledge framework, stop sweating the details. Grab the essence of the problem and the main contradiction.
In the future, I'll go even deeper with AI in everything I do. I also hope to lift my whole team's AI fluency and improve the workflow.
Here are a few practical AI deployments I've distilled from work — some already shipped, some that I want my team to ship later:
1. **Code dev**
    - Heavy use of GitHub Copilot to dramatically speed up coding and to auto-catch errors. Especially good for structured code. For unfamiliar libraries and APIs, it's totally possible to be in a state of *"I don't remember it, but somehow I can use it"* / *"I haven't read the docs, but once I get the framework I can write code right away."*
    - Use git hooks to AI-review every commit. Keeps quality up and obvious mistakes out.
    - Standardize project layout. Use the `tree` command (Windows) plus AI to keep directory structure clean.
    - Reasoning about new requirements. When you face something you've never built, your first plan often misses corners. Ask AI to analyze: what's the solution path, what should you watch for?
2. **Game design / config**
    - Use AI to name variables. Few people pull off "faithful, expressive, elegant" naming. Things get confusing fast — AI helps a lot.
    - Use AI for localization, even one-click scripts. High-quality, low-cost passable multi-language.
    - Use AI for Excel formulas and number-crunching. Heavy Excel formulas are insane — just ask AI.
    - Use AI to debug error messages. Designers usually aren't from a code background and are stumped by errors. Paste the error, ask AI; most of the time you get something actionable. (This applies to anyone touching a project!)
    - Use AI to write designer-side tools. Spot pain points in your own task and quickly write a tool to remove them.
    - Idea collection. AI can quickly throw out a lot of ideas; you still have to filter and synthesize.
3. **Art**
    - Reference and inspiration. Set up SD and Midjourney pipelines. Anything you can't Google up in the right "vibe," ask AI to draw. Quickly confirm direction with the requesting team. Build a curated prompt library by style — you can rapidly produce on-brief mockups, and unimportant cutscenes / scene art can ship as-is.
    {{< img src="IMG_3637.JPG" alt="alt text" width="500" >}}
    {{< img src="IMG_3638.JPG" alt="alt text" width="500" >}}
    {{< img src="IMG_3639.JPG" alt="alt text" width="500" >}}
    - **Item icons, character concept art** — already shipped successfully in the past. Tons of icons, even character concepts. AI does the first pass, art polishes — huge efficiency gain.
    {{< img src="image-3.png" alt="alt text" width="800" >}}
    {{< img src="image-4.png" alt="alt text" width="250" >}}
    {{< img src="image-5.png" alt="alt text" width="250" >}}
    {{< img src="image-6.png" alt="alt text" width="250" >}}
4. **Other**
    - Voiceover. If you need it, GPT-SoVITS does customized VO well.


Two reference videos for understanding AI's origins:
[【Computer History】 NLP from "Past" to "Present"](https://www.youtube.com/watch?v=RUtvBkibIT8)
[Why the Feynman Technique is called the ultimate learning method](https://www.youtube.com/watch?v=7iNJyEbYDdc&t=408s)
