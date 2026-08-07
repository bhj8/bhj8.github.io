#!/usr/bin/env python3
"""把一个单文件 HTML 游戏挂到博客上。

    python3 tools/publish-game.py <源文件.html> <slug>

例：
    python3 tools/publish-game.py ~/void-protocol.html void-protocol
    → static/games/void-protocol/index.html
    → 上线地址 https://bhj8.github.io/games/void-protocol/

脚本唯一做的事情是把外部 CDN 引用改成 static/games/vendor/ 下的本地副本。
理由：cdnjs 和 Google Fonts 在国内不稳定甚至完全不通，CDN 挂了游戏就打不开，
而 Google Fonts 那个 <link> 是渲染阻塞的，超时前整页白屏。

迭代新版本时重复跑这条命令覆盖即可，博客链接不变。
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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, slug = sys.argv[1], sys.argv[2]
    if not os.path.isfile(src):
        sys.exit(f'找不到源文件: {src}')

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
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, 'index.html')
    shutil.copyfile(src, dst + '.tmp')
    open(dst, 'w', encoding='utf-8').write(html)
    os.remove(dst + '.tmp')
    os.chmod(dst, 0o644)

    print(f'\n{os.path.relpath(dst, ROOT)}  {len(html) / 1024:.1f} KB')
    print(f'本地预览: hugo server → http://localhost:1313/games/{slug}/')


if __name__ == '__main__':
    main()
