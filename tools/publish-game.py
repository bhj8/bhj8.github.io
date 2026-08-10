#!/usr/bin/env python3
"""把一个 HTML 游戏挂到博客上。

    python3 tools/publish-game.py <入口.html> <slug>

例：
    python3 tools/publish-game.py ~/void-protocol.html void-protocol
    python3 tools/publish-game.py ~/frontline/frontline.html frontline
    → static/games/<slug>/index.html
    → 上线地址 https://bhj8.github.io/games/<slug>/

单文件和多文件都支持：入口 html 里用相对路径引的 js/css/资源目录会一起搬过去
（只搬被引到的那些，src/ 之外的开发文件不会进仓库）。

另外把外部 CDN 引用改成 static/games/vendor/ 下的本地副本。理由：cdnjs 和
Google Fonts 在国内不稳定甚至完全不通，CDN 挂了游戏就打不开，而 Google Fonts
那个 <link> 是渲染阻塞的，超时前整页白屏。

目标目录每次会先清空，所以旧版本残留的文件不会留在仓库里。
迭代新版本时重复跑这条命令即可，博客链接不变。
"""
import os
import re
import shutil
import sys

# CDN URL 片段 → 本地相对路径（相对 static/games/<slug>/index.html）
REWRITES = [
    (re.compile(r'https://cdnjs\.cloudflare\.com/ajax/libs/three\.js/r128/three\.min\.js'),
     '../vendor/three.min.js'),
    (re.compile(r'https://fonts\.googleapis\.com/css2\?[^"\']*'),
     '../vendor/fonts.css'),
]

# 整行删掉的标签（preconnect 到已经不用的域名）
DROP_LINE = re.compile(r'^\s*<link[^>]*rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*$')

# 搬过来的 js 里要打的补丁：(文件, 原文, 替换)。找不到原文会报错退出，
# 免得游戏改了写法之后补丁静默失效、线上又变回坏的。
PATCHES = [
    # FRONTLINE 认为「页面是 http(s) 打开的 ⇒ 你已经在房主的服务器上」，于是
    # 自动切到联机并连本站。博客是纯静态托管，没有 host.js，结果是进来就无限
    # 重连失败。这里强制回单机；想联机的人自己开 host.js 从本地打开。
    ('src/main.js',
     "const fromHost=typeof location!=='undefined'&&/^https?:$/.test(location.protocol||'');",
     "const fromHost=false;  /* 博客静态托管，没有 host.js，自动联机只会一直重连失败 */"),
]

REF = re.compile(r'(?:src|href)="([^"]+)"')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def local_refs(html):
    """入口 html 引用的本地路径，收敛到各自的顶层目录/文件名。"""
    out = []
    for ref in REF.findall(html):
        if re.match(r'(https?:)?//|data:|#|\.\./', ref):
            continue
        top = ref.split('?')[0].split('#')[0].split('/')[0]
        if top and top not in out:
            out.append(top)
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, slug = sys.argv[1], sys.argv[2]
    if not os.path.isfile(src):
        sys.exit(f'找不到入口文件: {src}')
    src_dir = os.path.dirname(os.path.abspath(src))

    html = open(src, encoding='utf-8').read()
    html = '\n'.join(l for l in html.split('\n') if not DROP_LINE.match(l))
    for pat, local in REWRITES:
        html, n = pat.subn(local, html)
        if n:
            print(f'  {pat.pattern[:52]}… → {local}  ×{n}')

    left = sorted(set(re.findall(r'(?:src|href)="(https?://[^"]+)"', html)))
    if left:
        print('\n  ! 仍有外部依赖，CDN 不通时会影响加载：')
        for u in left:
            print('    -', u)

    dst_dir = os.path.join(ROOT, 'static', 'games', slug)
    if os.path.isdir(dst_dir):
        shutil.rmtree(dst_dir)
    os.makedirs(dst_dir)

    dst = os.path.join(dst_dir, 'index.html')
    open(dst, 'w', encoding='utf-8').write(html)
    os.chmod(dst, 0o644)
    total = len(html.encode('utf-8'))

    for name in local_refs(html):
        s = os.path.join(src_dir, name)
        if not os.path.exists(s):
            print(f'  ! 引用了但找不到: {name}')
            continue
        d = os.path.join(dst_dir, name)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copyfile(s, d)
        n = sum(os.path.getsize(os.path.join(r, f))
                for r, _, fs in os.walk(d) for f in fs) if os.path.isdir(s) else os.path.getsize(d)
        total += n
        print(f'  + {name}  {n / 1024:.1f} KB')

    for rel, old, new in PATCHES:
        f = os.path.join(dst_dir, rel)
        if not os.path.isfile(f):
            continue
        body = open(f, encoding='utf-8').read()
        if old not in body:
            sys.exit(f'\n补丁失效：{rel} 里找不到要替换的那行。游戏改了写法，'
                     f'请更新 tools/publish-game.py 的 PATCHES 再发布。')
        open(f, 'w', encoding='utf-8').write(body.replace(old, new))
        print(f'  ~ {rel} 已打补丁')

    for r, _, fs in os.walk(dst_dir):
        for f in fs:
            os.chmod(os.path.join(r, f), 0o644)

    print(f'\n{os.path.relpath(dst_dir, ROOT)}/  共 {total / 1024:.1f} KB')
    print(f'本地预览: hugo server → http://localhost:1313/games/{slug}/')


if __name__ == '__main__':
    main()
