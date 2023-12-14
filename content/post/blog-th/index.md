---
title: 我博客的背后的技术原理
description: 深思熟虑后一个全球访问都飞速的方案，针对国内进行特别优化
date: 2023-12-13
categories:
    - 技术
tags:
    - 互联网通讯
    - 博客技术
---

### 博客开发面临的问题
再创建博客之前，有以下几个问题。  
1.选用一个简单易用、通用性强的博客框架。并且美观。  
2.功能齐全，可以有评论等等多样性的功能。  
3.完全不怕黑客攻击，特别是DDOS攻击。  
4.针对国内网络进行优化，要求国内访问也能非常迅速。  
5.不想备案，虽然无违规内容。但是不想，好麻烦。  

### 博客技术全面解析

博客框架采用了go语言的hugo框架，并选了一个帅气的主题。  
博客全面托管于github page，后台在github codespace上远程用vscode编写。并且使用github action，git提交后自动进行部署更新。只需10秒新内容即可自动更新完毕。  
在cloudflare上购买了baohongjiang.com十年的所有权，并关联到github page。访问baohongjiang.com即可进入博客。当然一路上都是https加密的。  
采用google analytics和cloudflare分别进行流量分析，能准确知晓访问用户的各项数据。  
采用disqus进行评论管理，众所周知的原因，评论国内不可见，不可发表。  

至此，博客功能齐全，效率极高。网页本质是静态的，并不害怕任何黑客攻击后台。并且由于页面托关于github page，并使用cloudflare进行代理。DDOS攻击首先要突破cloudflare，然后打崩github。才能伤害到我的博客。初略估计没几十T每秒是打不下的。我倒是希望我博客真有那资格被这样打。哈哈哈。  

至此，由于众所周知的原因，国内虽然能正常访问，速度还行。但是延迟高达200ms以上，且丢包严重。必须针对国内进行单独优化。  
cloudflare虽然有地域的负载均衡，但是企业级的，老贵了。一不做二不休，我直接购买了baohongjiang.cn的域名。并且进行大量测试，选用市面上最优的香港某GIA专线VPS，进行nginx反代。  
当你登录baohongjiang.cn的时，本质上是通过这个GIA专线的VPS访问我的网站。国内各运营商延迟能压到30ms左右，并且丢包率极低。访问速度飞快。  

整体访问路径  
用户 --> baohongjiang.cn --> 香港VPS --> baohongjiang.com --> cloudflare --> github page（源站）  

baohongjiang.com作为国际通用核心入口，坚如磐石。baohongjiang.cn为国内提供飞快的访问加速。  


该方案并不是最省钱的，其实采用最原始的github page完全不用掏一分钱。但我就想追求牛逼。  
