#!/usr/bin/env sh
cd "$(dirname "$0")"
# V92: the Python server opens the browser only after a successful bind.
python3 force_server.py
