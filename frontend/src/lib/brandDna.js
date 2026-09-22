/**
 * Brand DNA vocabulary — agency edition.
 *
 * Every option is written the way a shop owner would describe their own photos,
 * not the way a designer would. The old list asked for "brand archetype" and
 * "market positioning"; nobody selling sambal online can answer that, and the
 * answers never changed the picture anyway.
 *
 * Each entry carries a plain-language hint so the choice can be made without
 * guessing. The `id` is what reaches the image prompt, so it is written as a
 * short descriptive phrase rather than a code.
 */

export const KATEGORI = [
  "Skincare & Kecantikan",
  "Makanan & Minuman",
  "Fashion & Aksesori",
  "Parfum & Wewangian",
  "Perawatan Tubuh",
  "Kesehatan & Herbal",
  "Perlengkapan Rumah",
  "Ibu & Bayi",
  "Elektronik & Gadget",
  "Jasa",
  "Lainnya",
];

export const USIA = [
  { id: "remaja 15-20 tahun", label: "Remaja", hint: "15–20 tahun" },
  { id: "dewasa muda 21-27 tahun", label: "Dewasa muda", hint: "21–27 tahun" },
  { id: "dewasa 28-35 tahun", label: "Dewasa", hint: "28–35 tahun" },
  { id: "dewasa mapan 36-45 tahun", label: "Mapan", hint: "36–45 tahun" },
  { id: "semua umur", label: "Semua umur", hint: "Tidak dibatasi" },
];

/** One combined list: asking age and buyer type separately was two questions
 *  for one answer, and the prompt reads them as a single sentence anyway. */
export const SIAPA = [
  { id: "perempuan muda 18-27 tahun", label: "Perempuan muda" },
  { id: "perempuan dewasa 28-40 tahun", label: "Perempuan dewasa" },
  { id: "laki-laki muda 18-27 tahun", label: "Laki-laki muda" },
  { id: "laki-laki dewasa 28-40 tahun", label: "Laki-laki dewasa" },
  { id: "ibu muda", label: "Ibu muda" },
  { id: "pelajar & mahasiswa", label: "Pelajar & mahasiswa" },
  { id: "pekerja kantoran", label: "Pekerja kantoran" },
  { id: "semua kalangan", label: "Semua kalangan" },
];

/** How the photo should feel. One choice — the whole look hangs off it. */
export const MOOD = [
  { id: "hangat dan ramah", label: "Hangat & ramah", hint: "Akrab, bikin nyaman dilihat" },
  { id: "bersih dan tenang", label: "Bersih & tenang", hint: "Lapang, rapi, minimalis" },
  { id: "mewah dan elegan", label: "Mewah & elegan", hint: "Premium, berkelas, mahal" },
  { id: "ceria dan berani", label: "Ceria & berani", hint: "Warna kuat, penuh energi" },
  { id: "alami dan membumi", label: "Alami & membumi", hint: "Organik, apa adanya, jujur" },
  { id: "modern dan tajam", label: "Modern & tajam", hint: "Tegas, bersih, kekinian" },
  { id: "manis dan lembut", label: "Manis & lembut", hint: "Pastel, feminin, kalem" },
  { id: "klasik dan hangat", label: "Klasik & hangat", hint: "Nostalgia, vintage, sepia" },
];

export const CAHAYA = [
  { id: "cahaya matahari pagi", label: "Matahari pagi", hint: "Segar, bayangan lembut" },
  { id: "cahaya sore keemasan", label: "Sore keemasan", hint: "Hangat, kuning keemasan" },
  { id: "studio putih bersih", label: "Studio putih", hint: "Terang merata, latar bersih" },
  { id: "cahaya lembut merata", label: "Lembut merata", hint: "Nyaris tanpa bayangan" },
  { id: "cahaya dramatis berbayang", label: "Dramatis", hint: "Kontras tinggi, bayangan tegas" },
  { id: "cahaya terang benderang", label: "Terang benderang", hint: "Cerah, ceria, penuh cahaya" },
];

/** What the product sits on or is surrounded by. Max 3. */
export const MATERIAL = [
  { id: "marmer", label: "Marmer" },
  { id: "kayu", label: "Kayu" },
  { id: "kain linen", label: "Kain linen" },
  { id: "beton", label: "Beton" },
  { id: "kaca", label: "Kaca" },
  { id: "pasir dan batu", label: "Pasir & batu" },
  { id: "dedaunan", label: "Dedaunan" },
  { id: "kertas", label: "Kertas" },
  { id: "logam", label: "Logam" },
  { id: "air", label: "Air" },
  { id: "latar polos", label: "Latar polos" },
  { id: "meja dapur", label: "Meja dapur" },
];

export const KOMPOSISI = [
  { id: "produk dominan di tengah", label: "Produk dominan", hint: "Produk besar, memenuhi frame" },
  { id: "produk kecil dengan banyak ruang kosong", label: "Banyak ruang kosong", hint: "Lega, elegan, ada tempat untuk teks" },
  { id: "produk ditata bersama properti pendukung", label: "Ditata dengan properti", hint: "Ada benda pendukung di sekitarnya" },
  { id: "produk dipegang tangan model", label: "Dipegang tangan", hint: "Terasa nyata dan dipakai orang" },
  { id: "diambil dari atas (flat lay)", label: "Dilihat dari atas", hint: "Tampak atas, tertata rapi" },
  { id: "close-up detail produk", label: "Close-up detail", hint: "Tekstur dan label terlihat jelas" },
];

/** How the caption should sound. Feeds the copywriting, not the image. */
export const NADA_CAPTION = [
  { id: "santai dan akrab", label: "Santai & akrab", hint: "Seperti ngobrol dengan teman" },
  { id: "sopan dan informatif", label: "Sopan & informatif", hint: "Jelas, menjelaskan manfaat" },
  { id: "semangat dan persuasif", label: "Semangat & persuasif", hint: "Mengajak, ada dorongan beli" },
  { id: "tenang dan elegan", label: "Tenang & elegan", hint: "Sedikit kata, berkelas" },
];

/** Hard limits. These become negative instructions in the prompt. */
export const LARANGAN = [
  { id: "tanpa model manusia", label: "Tanpa model manusia" },
  { id: "tanpa tulisan berlebihan", label: "Tanpa tulisan berlebihan" },
  { id: "tanpa warna neon", label: "Tanpa warna neon" },
  { id: "tanpa latar gelap", label: "Tanpa latar gelap" },
  { id: "tanpa properti ramai", label: "Tanpa properti ramai" },
  { id: "tanpa efek berlebihan", label: "Tanpa efek berlebihan" },
  { id: "tanpa tangan atau jari", label: "Tanpa tangan/jari" },
  { id: "tanpa bayangan keras", label: "Tanpa bayangan keras" },
];

/** Starting palette so a client is never staring at three empty swatches. */
export const WARNA_SARAN = [
  "#0B3D2E", "#1A5F4A", "#E5C158", "#D4AF37", "#C28E6E",
  "#1C1917", "#FDFBF7", "#DDE9E1", "#AFC9E8", "#6F9FD1",
  "#E8B4B8", "#8B5E3C",
];

/** Turns a stored brand profile into the shape the form edits. */
export function emptyBrandDna() {
  return {
    brand_name: "",
    category: "",
    logo_base64: null,
    colors: [],
    audience_age: "",
    audience_who: [],
    mood: "",
    lighting: "",
    materials: [],
    composition: "",
    caption_tone: "",
    notes: "",
    donts: [],
    donts_notes: "",
  };
}
