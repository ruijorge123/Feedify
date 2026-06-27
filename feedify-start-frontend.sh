#!/bin/bash
export PATH="/Users/ruijorge/.nvm/versions/node/v20.20.2/bin:$PATH"
export REACT_APP_BACKEND_URL=http://localhost:8001
export REACT_APP_GOOGLE_CLIENT_ID=1060839167714-9tu896fo81c01k9rqu62lok99e0buvra.apps.googleusercontent.com
export BROWSER=none
cd /Users/ruijorge/Documents/FREESE/feedify-main/frontend
exec yarn start
