#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./scripts/check-runtime.sh
python3 tests/run.py --export
python3 tests/advanced.py --export
python3 tests/articles.py
node --test tests/*test.mjs
