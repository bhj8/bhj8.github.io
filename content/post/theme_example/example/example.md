---
title: "My Awesome Post"  # 文章的标题
description: "A brief summary of my post."  # 文章的简短描述
date: 2022-01-01  # 文章的发布日期
lastmod: 2022-01-10  # 文章的最后修改日期
draft: true  # 是否为草稿，true表示是草稿，不会被发布
slug: "my-custom-url"  # 自定义的URL路径
image: "path/to/image.jpg"  # 文章的主图像
categories:  # 文章的类别
  - Programming
  - Web Development
tags:  # 文章的标签
  - JavaScript
  - HTML
math: true  # 是否在文章中使用数学公式
# weight: 1  # 文章在列表中的权重，数字越小越靠前
aliases:  # 旧的URL，用于重定向
  - "/old-url/"
audio: ["path/to/audio.mp3"]  # 与文章相关的音频文件路径
cascade:  # 传递给子页面的键值对
  key: value
headless: false  # 是否为无头模式，true表示是
images:  # 与文章相关的其他图片路径
  - "path/to/related/image1.jpg"
  - "path/to/related/image2.jpg"
isCJKLanguage: false  # 是否为CJK（中日韩）语言，影响文章摘要和词数的处理
keywords: ["keyword1", "keyword2"]  # 内容的元关键词
layout: "default"  # Hugo在渲染时选择的布局
linkTitle: "Short Link Title"  # 用于创建到内容的链接的标题
markup: "md"  # 用于内容的标记语言，如"md"表示Markdown
outputs:  # 指定的输出格式
  - "HTML"
publishDate: 2022-01-05  # 文章的预定发布日期，未到此日期不会发布
resources:  # 页面资源配置
  - src: "path/to/resource.jpg"
    title: "Resource Title"
series:  # 文章所属的系列名称
  - "Series Name"
type: "post"  # 内容的类型
url: "/custom-full-url-path/"  # 重写整个URL路径
videos: ["path/to/video.mp4"]  # 与文章相关的视频文件路径
---

你的文章内容放在这里...
