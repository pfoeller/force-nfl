#!/usr/bin/env python3
"""Build the browser-visible FORCE frontend into ./public.

The source files remain in their historical V149 locations so existing tests and
local development keep working. Only files required by the browser are copied
into public/ for Cloudflare Static Assets.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

if PUBLIC.exists():
    shutil.rmtree(PUBLIC)
PUBLIC.mkdir(parents=True)

shutil.copy2(ROOT / "index.html", PUBLIC / "index.html")
shutil.copytree(ROOT / "assets", PUBLIC / "assets")

for dirname in ("data", "model"):
    src = ROOT / dirname
    dst = PUBLIC / dirname
    dst.mkdir(parents=True)
    for path in src.glob("*.js"):
        shutil.copy2(path, dst / path.name)

print(f"Built FORCE public assets in {PUBLIC}")
