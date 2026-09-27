# Feedify

Creative agency AI untuk brand lokal: klien beli paket feed, tim Feedify yang mengerjakan.
Live di **www.feedifyid.com**.

## Struktur

```
backend/            FastAPI + MongoDB (deploy: Vercel project feedify-server)
  server.py         hampir semua endpoint API
  agency/           klien, Brand DNA, produk, kuota feed
  market/           riset tren & keyword (Growth Consultant)
  video/            pipeline Reels (fal.ai Kling + GPT-4o)
  feedify_config.py harga paket default (bisa ditimpa dari Admin Panel)
  .env.example      daftar variabel lingkungan
frontend/           React 19 + CRA/CRACO + Tailwind (deploy: Vercel project feedify-ai)
  src/pages/        satu file per halaman
  src/lib/          state global kecil, API client, konfigurasi
  public/           gambar & video portofolio, disajikan apa adanya
  assets-raw/       file mentah, tidak ikut deploy
  .env.example
scripts/            start-backend.sh, start-frontend.sh
docs/               PRD + arsip dari platform Emergent
start.sh            setup + jalankan backend & frontend sekaligus
```

## Jalan di lokal

```bash
cp backend/.env.example backend/.env      # lalu isi nilainya
cp frontend/.env.example frontend/.env
./start.sh                                # atau scripts/start-backend.sh + scripts/start-frontend.sh
```

## Deploy

Vercel **belum tersambung ke GitHub** — push tidak otomatis deploy. Dari root repo:

```bash
cd frontend && yarn lint:undef && CI=true yarn build && cd ..   # Vercel build dengan CI=true: warning = error
vercel --prod --yes                                             # .vercel/project.json menentukan project-nya
```
