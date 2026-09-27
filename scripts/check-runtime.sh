#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v dyalog >/dev/null 2>&1; then
    echo 'Dyalog is not on PATH. See docs/development.md.' >&2
    exit 127
fi
ENABLE_CEF=0 exec dyalog -script scripts/smoke.apls
