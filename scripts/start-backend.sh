#!/bin/bash
# Jalankan backend saja (port 8001, auto-reload). Bisa dipanggil dari folder mana pun.
BACKEND="$(cd "$(dirname "$0")/../backend" && pwd)"
source "$BACKEND/.venv/bin/activate"
cd "$BACKEND"
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload --reload-dir "$BACKEND"
