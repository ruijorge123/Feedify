#!/bin/bash
source /Users/ruijorge/Documents/FREESE/feedify-main/backend/.venv/bin/activate
cd /Users/ruijorge/Documents/FREESE/feedify-main/backend
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload --reload-dir /Users/ruijorge/Documents/FREESE/feedify-main/backend
