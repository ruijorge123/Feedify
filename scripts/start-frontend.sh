#!/bin/bash
# Jalankan frontend saja (port 3000). Bisa dipanggil dari folder mana pun.
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# Auto-detect IP LAN terkini (biar HP tetap bisa akses walau IP router berubah); fallback ke localhost
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost)
export REACT_APP_BACKEND_URL=http://${LAN_IP}:8001
echo "[feedify] Frontend pakai backend: $REACT_APP_BACKEND_URL"
# REACT_APP_GOOGLE_CLIENT_ID dan REACT_APP_WEBPUSHR_KEY dibaca dari frontend/.env
export BROWSER=none
cd "$(dirname "$0")/../frontend"
exec yarn start
