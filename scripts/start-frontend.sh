#!/bin/bash
export PATH="/Users/ruijorge/.nvm/versions/node/v20.20.2/bin:$PATH"
# Auto-detect IP LAN terkini (biar HP tetap bisa akses walau IP router berubah); fallback ke localhost
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost)
export REACT_APP_BACKEND_URL=http://${LAN_IP}:8001
echo "[feedify] Frontend pakai backend: $REACT_APP_BACKEND_URL"
export REACT_APP_GOOGLE_CLIENT_ID=1060839167714-9tu896fo81c01k9rqu62lok99e0buvra.apps.googleusercontent.com
export BROWSER=none
cd /Users/ruijorge/Documents/FREESE/feedify-main/frontend
exec yarn start
