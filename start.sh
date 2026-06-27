#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[feedify]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
die()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

# ── cleanup on Ctrl+C ────────────────────────────────────────────────────────
BE_PID=""
FE_PID=""
cleanup() {
  echo ""
  log "Menghentikan server..."
  [ -n "$BE_PID" ] && kill "$BE_PID" 2>/dev/null
  [ -n "$FE_PID" ] && kill "$FE_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. Node.js ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  die "Node.js tidak ditemukan. Install dari https://nodejs.org (versi 18+) lalu jalankan lagi."
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "Node.js versi $(node --version) terdeteksi. Disarankan versi 18+."
  warn "Download dari https://nodejs.org jika ada masalah build."
fi

# ── 2. Yarn ───────────────────────────────────────────────────────────────────
if ! command -v yarn &>/dev/null; then
  log "Menginstall yarn via npm..."
  npm install -g yarn --silent
fi

# ── 3. Python & pip ──────────────────────────────────────────────────────────
# python3 tidak selalu ada di Windows (sering cuma "python") — coba dua-duanya.
if command -v python3 &>/dev/null; then
  PY_CMD=python3
elif command -v python &>/dev/null; then
  PY_CMD=python
else
  die "Python tidak ditemukan. Install dari https://www.python.org lalu jalankan lagi."
fi

# Bootstrap pip jika belum ada
if ! "$PY_CMD" -m pip --version &>/dev/null 2>&1; then
  log "Menginstall pip..."
  "$PY_CMD" -m ensurepip --upgrade 2>/dev/null || {
    curl -sSL https://bootstrap.pypa.io/get-pip.py | "$PY_CMD"
  }
fi

# ── 4. Python virtual environment ────────────────────────────────────────────
VENV_DIR="$BACKEND_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  log "Membuat Python virtual environment..."
  "$PY_CMD" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
if [ -f "$VENV_DIR/bin/activate" ]; then
  source "$VENV_DIR/bin/activate"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
  source "$VENV_DIR/Scripts/activate"
else
  die "Tidak ditemukan activate script di $VENV_DIR. Hapus folder .venv dan jalankan lagi."
fi

log "Menginstall Python dependencies..."
# emergentintegrations adalah package private Emergent — tidak tersedia di PyPI publik.
# Semua import-nya ada di dalam try/except di server.py, jadi stub lokal cukup.
# (/dev/stdin tidak bisa dipakai sebagai -r di Git Bash/Windows, jadi pakai file sementara)
TMP_REQ="$(mktemp)"
grep -v "emergentintegrations" "$BACKEND_DIR/requirements.txt" > "$TMP_REQ"
pip install -q --timeout=300 -r "$TMP_REQ"
rm -f "$TMP_REQ"
pip install -q -e "$BACKEND_DIR/emergentintegrations_stub/"

# ── 5. Backend .env ──────────────────────────────────────────────────────────
BACKEND_ENV="$BACKEND_DIR/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  warn "File backend/.env belum ada. Isi nilai berikut:"
  echo ""

  read -rp "  MONGO_URL (contoh: mongodb://localhost:27017): " MONGO_URL_VAL
  read -rp "  DB_NAME   (contoh: feedify): " DB_NAME_VAL
  DB_NAME_VAL="${DB_NAME_VAL:-feedify}"

  read -rp "  JWT_SECRET (bisa sembarang string panjang): " JWT_SECRET_VAL
  read -rp "  EMERGENT_LLM_KEY (untuk fitur AI, bisa kosong dulu): " EMERGENT_LLM_KEY_VAL

  cat > "$BACKEND_ENV" <<EOF
MONGO_URL=${MONGO_URL_VAL}
DB_NAME=${DB_NAME_VAL}
JWT_SECRET=${JWT_SECRET_VAL}
EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY_VAL}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=168
EOF
  log "backend/.env berhasil dibuat."
fi

# ── 6. Frontend .env ─────────────────────────────────────────────────────────
FRONTEND_ENV="$FRONTEND_DIR/.env"
if [ ! -f "$FRONTEND_ENV" ]; then
  echo "REACT_APP_BACKEND_URL=http://localhost:8001" > "$FRONTEND_ENV"
  log "frontend/.env berhasil dibuat (backend URL: http://localhost:8001)"
fi

# ── 7. Frontend dependencies ─────────────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  log "Menginstall frontend dependencies (ini mungkin butuh beberapa menit)..."
  cd "$FRONTEND_DIR" && yarn install --silent
  cd "$ROOT_DIR"
fi

# ── 8. Start backend ─────────────────────────────────────────────────────────
echo ""
log "${BOLD}Memulai Backend${NC} → http://localhost:8001"
cd "$BACKEND_DIR"
uvicorn server:app --reload --host 0.0.0.0 --port 8001 &
BE_PID=$!

# Tunggu backend siap
log "Menunggu backend siap..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8001/api/ &>/dev/null; then
    log "Backend siap."
    break
  fi
  sleep 1
  if [ "$i" -eq 20 ]; then
    warn "Backend belum merespons setelah 20 detik — cek log di atas."
  fi
done

# ── 9. Start frontend ────────────────────────────────────────────────────────
echo ""
log "${BOLD}Memulai Frontend${NC} → http://localhost:3000"
cd "$FRONTEND_DIR"
yarn start &
FE_PID=$!

echo ""
echo -e "${GREEN}${BOLD}======================================${NC}"
echo -e "${GREEN}${BOLD}  Feedify berjalan!${NC}"
echo -e "${GREEN}  Frontend : http://localhost:3000${NC}"
echo -e "${GREEN}  Backend  : http://localhost:8001/api/${NC}"
echo -e "${GREEN}${BOLD}  Tekan Ctrl+C untuk menghentikan.${NC}"
echo -e "${GREEN}${BOLD}======================================${NC}"
echo ""

wait
