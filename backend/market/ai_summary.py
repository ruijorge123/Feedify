"""
Template-based content builder — v2.
~200 parametric templates. No LLM. Deterministik berdasarkan keyword hash.
"""

from __future__ import annotations
import hashlib


def _pick(pool: list[str], seed: str) -> str:
    idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


# ════════════════════════════════════════════════════════════════════════
# TRENDS SUMMARY (/trends endpoint)
# ════════════════════════════════════════════════════════════════════════

_TRENDS_OPEN_RISING = [
    'Pencarian paling aktif saat ini mengarah pada "{r1}" dan "{r2}", menandakan pergeseran minat yang cukup signifikan di kategori {k}.',
    'Kata kunci "{r1}" sedang muncul sebagai pencarian breakout — ada segmen pasar baru yang terbentuk di sekitar {k}.',
    'Data menunjukkan "{r1}" naik paling cepat. Ini sinyal kuat bahwa konsumen sedang aktif membandingkan pilihan di kategori {k}.',
    'Lonjakan pencarian "{r1}" mengindikasikan konsumen sudah melewati fase awareness dan mulai masuk ke fase keputusan pembelian.',
    'Tren pencarian "{r1}" yang meledak menunjukkan topik ini jadi percakapan aktif — momentum terbaik untuk publish konten {k}.',
    'Ada pergerakan nyata: "{r1}" dan "{r2}" naik drastis, menandakan audiens {k} sedang dalam fase riset yang intensif.',
    'Pencarian "{r1}" naik breakout — artinya ada kebutuhan spesifik baru yang mulai terbentuk di pasar {k}.',
]

_TRENDS_OPEN_TOP = [
    'Keyword terkait paling sering dicari bersama {k} adalah "{t1}" dan "{t2}" — audiensmu sudah spesifik mencari solusi.',
    'Pola pencarian di sekitar {k} terkonsentrasi pada "{t1}", menunjukkan ada pertanyaan utama yang belum terjawab di pasar.',
    'Konsumen mencari {k} bersama "{t1}" — ini petunjuk angle konten paling relevan untuk audiensmu.',
    'Search pattern di sekitar {k} sangat terpola: "{t1}" dan "{t2}" muncul konsisten, artinya ada kebutuhan spesifik yang berulang.',
    'Audiens yang mencari {k} cenderung juga mencari "{t1}" — peluang untuk menjawab dua kebutuhan dalam satu konten.',
    'Volume pencarian mengarah pada "{t1}" dan "{t2}" — ini sinyal apa yang paling dibutuhkan audiens {k} saat ini.',
]

_TRENDS_OPEN_EMPTY = [
    'Volume pencarian untuk {k} mencatat aktivitas yang cukup konsisten dalam 30 hari terakhir.',
    'Data 30 hari terakhir menunjukkan {k} masih memiliki basis pencarian yang stabil di pasar.',
    'Minat pasar terhadap {k} terpantau aktif dalam periode yang dianalisis.',
    'Meskipun data keyword terkait terbatas, volume pencarian {k} sendiri menunjukkan permintaan yang nyata.',
    '{k} memiliki pola pencarian yang steady — demand organik yang bisa dimonetisasi.',
]

_TRENDS_BODY_STRONG = [
    'Momentum ini jarang terjadi — window optimal untuk publish konten sedang terbuka lebar. Prioritaskan konten edukasi dan testimoni yang membangun kepercayaan.',
    'Kenaikan ini memberi keuntungan first-mover: brand yang aktif sekarang akan diingat lebih lama oleh audiens yang baru masuk kategori ini.',
    'Period kenaikan seperti ini biasanya berlangsung 3–6 minggu. Manfaatkan dengan jadwal konten konsisten dan bervariasi.',
    'Growth rate ini menempatkan {k} dalam kategori "trending with intent" — audiensnya tidak hanya browsing, tapi siap membeli.',
    'Ini bukan sekadar tren sesaat. Kenaikan konsisten ini mencerminkan pergeseran perilaku konsumen yang lebih dalam.',
    'Saat tren naik sekuat ini, konten yang muncul pertama di feed audiens punya konversi tertinggi. Waktu eksekusi adalah keunggulan kompetitif.',
    'Permintaan sedang di puncaknya — brand yang terlihat aktif sekarang akan langsung diasosiasikan dengan kategori ini.',
]

_TRENDS_BODY_MODERATE = [
    'Tren positif yang stabil seperti ini lebih berharga dari viral singkat — audiensnya lebih loyal dan conversion rate-nya biasanya lebih tinggi.',
    'Growth moderat ini ideal untuk strategi content series: bangun otoritas secara bertahap sambil menjaga konsistensi algoritma.',
    'Pasar dalam fase pertumbuhan yang sehat. Ini waktu yang tepat untuk membangun brand presence sebelum kompetisi meningkat.',
    'Kenaikan perlahan tapi konsisten sering menjadi pendahulu lonjakan besar. Positioning sekarang akan menguntungkan di fase berikutnya.',
    'Tren ini menunjukkan demand organik yang sehat — bukan hype, tapi genuine interest yang bisa dimonetisasi.',
    'Steady growth seperti ini paling efektif direspon dengan konten yang membangun kepercayaan, bukan konten promosi langsung.',
]

_TRENDS_BODY_FLAT = [
    'Kondisi flat menandakan pasar sudah mature. Diferensiasi konten jadi kunci — audiens butuh konten yang lebih relevan, bukan lebih banyak.',
    'Volume stabil berarti ada demand konsisten, tapi juga kompetisi yang tidak kendur. Fokus pada engagement quality, bukan quantity.',
    'Ini bukan saat untuk taktik volume tinggi. Investasi pada konten mendalam dengan nilai edukasi tinggi akan lebih efektif.',
    'Pasar flat bukan berarti peluang mati — ini sinyal untuk inovasi angle. Coba pendekatan yang belum banyak dipakai kompetitor.',
    'Stabilitas ini bisa jadi keunggulan: audience yang tetap aktif meskipun tidak ada momen viral adalah audience yang loyal.',
    'Market flat sering menandakan bahwa pemain lama sudah punya posisi kuat — untuk masuk, butuh diferensiasi yang tajam dan konsisten.',
]

_TRENDS_BODY_DECLINING = [
    'Penurunan ini bisa diperlambat atau dibalik dengan konten yang menjawab keberatan — FAQ, klarifikasi mitos, atau repositioning produk.',
    'Fase declining sering dimanfaatkan brand berani dengan promo agresif yang "melawan arus" — efeknya bisa sangat menonjol karena kompetitor mundur.',
    'Jika tren turun karena musim, tinggal tunggu; jika karena persepsi, butuh strategi konten yang mengubah narasi.',
    'Menurunnya pencarian tidak selalu berarti demand turun — bisa jadi konsumen sudah lebih teredukasi dan langsung mencari brand spesifik.',
    'Strategi terbaik di fase ini: pertahankan basis loyal dengan konten komunitas dan testimoni, bukan push konten promosi.',
    'Tren turun adalah peluang untuk re-engagement: audiens lama perlu diingatkan, audiens baru perlu diedukasi dari angle yang segar.',
]

_TRENDS_CLOSE = [
    'Gunakan Feedify untuk langsung eksekusi ide konten terbaik dari data ini.',
    'Saatnya ubah insight ini jadi konten yang bekerja untuk bisnismu.',
    'Data ini paling bernilai jika dieksekusi cepat — waktu adalah keunggulan kompetitif.',
    'Insight ini sudah cukup untuk membuat content plan 2 minggu ke depan.',
    'Ambil tindakan sekarang selagi kompetitor masih dalam fase analisis.',
    'Konten yang tepat waktu dan tepat sasaran selalu mengalahkan konten yang sempurna tapi terlambat.',
]


def build_trends_summary(
    keyword: str,
    trend_score: int,
    change_pct: float,
    rising: list[dict],
    top_keywords: list[str],
) -> str:
    k = keyword
    seed = keyword.lower()

    if rising:
        r1 = rising[0]["query"]
        r2 = rising[1]["query"] if len(rising) > 1 else r1
        tpl = _pick(_TRENDS_OPEN_RISING, seed + "open")
        opening = tpl.format(k=k, r1=r1, r2=r2)
    elif top_keywords:
        t1 = top_keywords[0]
        t2 = top_keywords[1] if len(top_keywords) > 1 else t1
        tpl = _pick(_TRENDS_OPEN_TOP, seed + "open")
        opening = tpl.format(k=k, t1=t1, t2=t2)
    else:
        tpl = _pick(_TRENDS_OPEN_EMPTY, seed + "open")
        opening = tpl.format(k=k)

    if change_pct >= 15:
        body_pool = _TRENDS_BODY_STRONG
    elif change_pct >= 3:
        body_pool = _TRENDS_BODY_MODERATE
    elif change_pct >= -3:
        body_pool = _TRENDS_BODY_FLAT
    else:
        body_pool = _TRENDS_BODY_DECLINING
    body = _pick(body_pool, seed + "body").format(k=k)

    close = _pick(_TRENDS_CLOSE, seed + "close")
    return f"{opening} {body} {close}"


# ════════════════════════════════════════════════════════════════════════
# OPPORTUNITY SUMMARY (/opportunity endpoint)
# ════════════════════════════════════════════════════════════════════════

_OPP_VERDICT_HIGH = [
    '"{k}" sedang berada di sweet spot: permintaan tinggi, belum jenuh, dan audiens aktif.',
    'Peluang pasar untuk "{k}" sangat terbuka — ini salah satu kombinasi data terbaik yang bisa terlihat.',
    '"{k}" menunjukkan semua sinyal positif: demand naik, pencarian aktif, dan kompetisi masih manageable.',
    'Dari sisi market timing, "{k}" berada di posisi ideal untuk digarap sekarang.',
    'Data menunjukkan "{k}" adalah kategori dengan momentum terbaik saat ini.',
    '"{k}" memiliki semua bahan untuk konten yang perform: demand nyata, pencarian spesifik, dan audiens yang siap.',
]

_OPP_VERDICT_MEDIUM = [
    '"{k}" memiliki fondasi yang solid — ada demand nyata yang bisa dimonetisasi dengan strategi yang tepat.',
    'Peluang di "{k}" ada, tapi butuh eksekusi yang lebih tepat sasaran untuk menonjol.',
    '"{k}" adalah kategori kompetitif dengan ruang yang masih bisa direbut oleh brand dengan konten berkualitas.',
    'Data di "{k}" menunjukkan pasar yang aktif — tidak mudah, tapi sangat bisa dimenangkan.',
    'Potensi "{k}" cukup baik asalkan kontennya menjawab kebutuhan spesifik yang terlihat dari data pencarian.',
]

_OPP_VERDICT_LOW = [
    '"{k}" masih bisa digarap, tapi butuh angle yang lebih spesifik untuk membedakan diri.',
    'Pasar "{k}" sedang dalam fase yang lebih tenang — peluang untuk membangun presence tanpa tekanan kompetisi tinggi.',
    '"{k}" butuh pendekatan yang lebih kreatif untuk membangkitkan demand yang belum sepenuhnya terbentuk.',
    'Kategori "{k}" menunjukkan potensi jangka panjang, meskipun konversi jangka pendek mungkin lebih lambat.',
]

_OPP_DEMAND_HIGH = [
    'Volume pencarian aktif menunjukkan demand yang genuine — konsumen tidak perlu diedukasi dari nol.',
    'Banyak orang sedang aktif mencari solusi di kategori ini, artinya traffic organik sudah tersedia.',
    'Demand tinggi berarti audiens sudah terbentuk — tugasmu adalah menjadi jawaban yang paling relevan.',
    'Pasar ini membuktikan ada kebutuhan nyata yang belum sepenuhnya terlayani — masih ada ruang untuk masuk.',
    'Dengan demand setinggi ini, konten yang tepat sasaran hampir pasti menemukan audiensnya.',
]

_OPP_DEMAND_MEDIUM = [
    'Basis audiens sudah ada dengan permintaan yang cukup konsisten.',
    'Ada demand yang stabil di kategori ini, cukup untuk mendukung pertumbuhan yang steady.',
    'Permintaan pasar di level ini memberikan runway yang cukup untuk eksekusi bertahap.',
    'Demand moderate ini ideal untuk brand yang ingin membangun presence jangka panjang, bukan sekadar viral sesaat.',
]

_OPP_DEMAND_LOW = [
    'Demand masih dalam tahap berkembang — fokuslah dulu pada konten awareness sebelum conversion.',
    'Pasar ini masih butuh edukasi. Konten yang menjawab "kenapa" lebih efektif dari "beli sekarang".',
    'Permintaan terbatas, tapi ini bisa berarti kamu bisa mendominasi niche lebih mudah dari kategori yang sudah ramai.',
]

_OPP_COMP_HIGH = [
    'Persaingan di kategori ini sudah intensif — diferensiasi melalui spesifikasi produk atau angle emosional sangat penting.',
    'Kompetisi tinggi tidak berarti tidak bisa menang, tapi butuh konten yang 10x lebih spesifik dan bernilai.',
    'Kategori ini ramai, tapi brand dengan story yang kuat dan konsistensi tinggi biasanya bisa menembus noise.',
    'Di pasar yang kompetitif, frekuensi publikasi saja tidak cukup — kualitas dan diferensiasi adalah kuncinya.',
]

_OPP_COMP_MEDIUM = [
    'Kompetisi moderat memberi ruang untuk masuk dengan konten yang lebih fokus dan konsisten.',
    'Ada pesaing, tapi belum sampai saturasi — masih ada posisi yang bisa direbut.',
    'Level persaingan ini masih ideal untuk pemain baru yang punya diferensiasi jelas.',
    'Kompetisi di sini wajar dan sehat — artinya pasar sudah terbukti, tapi belum terlalu sesak.',
]

_OPP_COMP_LOW = [
    'Persaingan konten rendah — keunggulan besar. Brand yang masuk sekarang bisa mendominasi dengan lebih mudah.',
    'Tidak banyak pemain aktif di kategori ini, artinya barrier attention jauh lebih rendah.',
    'Kompetisi rendah = biaya akuisisi audiens lebih murah dan jangkauan organik lebih luas.',
    'Ini momen langka: pasar yang ada demand-nya tapi belum penuh konten — first mover advantage sangat nyata di sini.',
]

_OPP_SEASON_HIGH = [
    'Permintaan bersifat musiman — timing konten sangat kritis. Masuk terlalu awal atau terlambat bisa sia-sia.',
    'Pola musiman ini harus jadi anchor content calendar kamu — semua konten besar perlu direncanakan jauh di depan.',
]
_OPP_SEASON_MEDIUM = [
    'Ada variasi musiman ringan — pertahankan konten sepanjang tahun dengan intensitas berbeda per musim.',
    'Fluktuasi musiman moderate: rencana konten tahunan akan membantu memanfaatkan setiap puncak permintaan.',
]
_OPP_SEASON_LOW = [
    'Tren cukup konsisten dengan fluktuasi minimal — konten evergreen bekerja dengan baik di kategori ini.',
    'Variansi rendah berarti tidak ada "waktu buruk" untuk publish — konsistensi lebih penting dari timing.',
]
_OPP_SEASON_STABLE = [
    'Permintaan sangat stabil — konten evergreen akan terus relevan tanpa perlu disesuaikan per musim.',
    'Stabilitas ini ideal untuk membangun aset konten jangka panjang yang terus mendatangkan traffic.',
]


def build_opportunity_summary(
    keyword: str,
    trend_score: int,
    demand_score: int,
    competition_score: int,
    content_potential: int,
    seasonality: str,
) -> str:
    k = keyword
    seed = keyword.lower()

    if content_potential >= 70:
        verdict = _pick(_OPP_VERDICT_HIGH, seed + "v").format(k=k)
    elif content_potential >= 50:
        verdict = _pick(_OPP_VERDICT_MEDIUM, seed + "v").format(k=k)
    else:
        verdict = _pick(_OPP_VERDICT_LOW, seed + "v").format(k=k)

    if demand_score >= 70:
        demand_note = _pick(_OPP_DEMAND_HIGH, seed + "d")
    elif demand_score >= 40:
        demand_note = _pick(_OPP_DEMAND_MEDIUM, seed + "d")
    else:
        demand_note = _pick(_OPP_DEMAND_LOW, seed + "d")

    if competition_score >= 70:
        comp_note = _pick(_OPP_COMP_HIGH, seed + "c")
    elif competition_score >= 40:
        comp_note = _pick(_OPP_COMP_MEDIUM, seed + "c")
    else:
        comp_note = _pick(_OPP_COMP_LOW, seed + "c")

    season_pools = {
        "high":    _OPP_SEASON_HIGH,
        "medium":  _OPP_SEASON_MEDIUM,
        "low":     _OPP_SEASON_LOW,
        "stable":  _OPP_SEASON_STABLE,
    }
    season_note = _pick(season_pools.get(seasonality, _OPP_SEASON_STABLE), seed + "s")

    return " ".join([verdict, demand_note, comp_note, season_note])


# ════════════════════════════════════════════════════════════════════════
# HEURISTIC SCORING — v2
# ════════════════════════════════════════════════════════════════════════

def compute_demand_score(
    trend_score: int,
    change_pct: float,
    rising: list[dict],
    top_keywords: list[str],
    timeline: list[dict],
) -> int:
    """
    Weighted demand score (0-100):
      Trend Score    35%
      Search Growth  25%
      Related Kw     20%
      Breakout Kw    10%
      Stability      10%
    """
    c_trend = trend_score * 0.35

    clamped = max(-50.0, min(change_pct, 50.0))
    c_growth = ((clamped + 50.0) / 100.0) * 25.0

    c_kw = min(len(top_keywords) / 8.0, 1.0) * 20.0

    breakout_count = sum(
        1 for r in rising if str(r.get("value", "")).lower() == "breakout"
    )
    c_breakout = min(breakout_count / 3.0, 1.0) * 10.0

    if timeline and len(timeline) >= 7:
        values = [t["value"] for t in timeline]
        mean = sum(values) / len(values)
        if mean > 0:
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            cv = (variance ** 0.5) / mean
            stability = max(0.0, 1.0 - cv)
        else:
            stability = 0.0
    else:
        stability = 0.5
    c_stability = stability * 10.0

    return min(100, round(c_trend + c_growth + c_kw + c_breakout + c_stability))


def compute_competition_score(trend_score: int, top_keywords: list[str]) -> int:
    base = min(75, round(trend_score * 0.68))
    kw_factor = min(20, len(top_keywords) * 3)
    return min(100, base + kw_factor)


def compute_content_potential(
    trend_score: int,
    demand_score: int,
    competition_score: int,
) -> int:
    return min(100, round(
        trend_score      * 0.35
        + demand_score   * 0.35
        + (100 - competition_score) * 0.30
    ))


def compute_confidence(
    timeline: list[dict],
    rising: list[dict],
    top_keywords: list[str],
    suggestions: list[str],
) -> int:
    """Confidence that opportunity data is reliable (0-100)."""
    score = 0
    if len(timeline) >= 28:
        score += 40
    elif len(timeline) >= 14:
        score += 25
    elif len(timeline) >= 7:
        score += 10

    score += min(len(rising) * 7, 20)
    score += min(len(top_keywords) * 3, 20)
    score += min(len(suggestions) * 2, 10)

    if rising and suggestions:
        rising_terms = {r["query"].lower() for r in rising}
        overlap = sum(
            1 for s in suggestions
            if any(rt in s.lower() for rt in rising_terms)
        )
        score += min(overlap * 3, 10)

    return min(100, score)


def compute_risk_flags(
    change_pct: float,
    competition_score: int,
    seasonality: str,
) -> list[str]:
    flags: list[str] = []
    if competition_score >= 70:
        flags.append("High Competition")
    if seasonality == "high":
        flags.append("Seasonal")
    if change_pct <= -10:
        flags.append("Declining")
    return flags


# ════════════════════════════════════════════════════════════════════════
# SUGGEST CATEGORIZATION
# ════════════════════════════════════════════════════════════════════════

def categorize_suggestions(
    suggestions: list[str],
    rising: list[dict],
) -> dict[str, list[str]]:
    """Split flat suggestions into top / breakout / long_tail."""
    rising_terms = {r["query"].lower() for r in rising}
    breakout: list[str] = []
    long_tail: list[str] = []
    top: list[str] = []

    for s in suggestions:
        s_lower = s.lower()
        is_breakout = any(rt in s_lower or s_lower in rt for rt in rising_terms)
        is_long = len(s.split()) >= 3

        if is_breakout:
            breakout.append(s)
        elif is_long:
            long_tail.append(s)
        else:
            top.append(s)

    return {"top": top[:5], "breakout": breakout[:5], "long_tail": long_tail[:5]}


# ════════════════════════════════════════════════════════════════════════
# RELATED TOPIC GROUPING
# ════════════════════════════════════════════════════════════════════════

_INGREDIENT_TERMS = {
    "niacinamide", "vitamin c", "retinol", "hyaluronic", "ceramide",
    "aha", "bha", "pha", "peptide", "collagen", "arbutin", "glutathione",
    "spf", "zinc", "salicylic", "bakuchiol", "squalane", "kojic",
    "tranexamic", "snail", "centella", "cica", "glycolic", "alpha arbutin",
    "ascorbic", "panthenol", "allantoin", "adenosine", "azelaic",
}

_CONCERN_TERMS = {
    "jerawat", "flek", "kusam", "kering", "berminyak", "sensitif",
    "pori", "kerutan", "anti aging", "brightening", "whitening",
    "bekas", "hiperpigmentasi", "kulit gelap", "glowing",
    "acne", "oily", "dry skin", "dark spot", "wrinkle", "penuaan",
    "elastisitas", "kulit cerah", "kulit sehat", "kulit lembap",
}

_ROUTINE_TERMS = {
    "pagi", "malam", "morning", "night", "routine", "step",
    "urutan", "cara pakai", "skincare routine", "langkah",
    "sebelum tidur", "setelah mandi", "toner", "moisturizer",
    "sunscreen", "cleanser", "serum", "essence",
}

_BRAND_COMMON = {
    "wardah", "somethinc", "skintific", "hanasui", "ms glow",
    "scarlett", "mixlab", "avoskin", "npure", "lacoco",
    "emina", "pixy", "loreal", "garnier", "pond", "nivea",
    "cetaphil", "the ordinary", "indomaret", "sociolla",
}


def group_topics(related_topics: list[str]) -> list[dict]:
    """Group related topics by inferred category."""
    groups: dict[str, list[str]] = {
        "Ingredients": [],
        "Skin Concern": [],
        "Routine": [],
        "Brand": [],
        "Other": [],
    }

    for topic in related_topics:
        t_lower = topic.lower()
        matched = False

        for term in _INGREDIENT_TERMS:
            if term in t_lower:
                groups["Ingredients"].append(topic)
                matched = True
                break
        if matched:
            continue

        for term in _CONCERN_TERMS:
            if term in t_lower:
                groups["Skin Concern"].append(topic)
                matched = True
                break
        if matched:
            continue

        for term in _ROUTINE_TERMS:
            if term in t_lower:
                groups["Routine"].append(topic)
                matched = True
                break
        if matched:
            continue

        for term in _BRAND_COMMON:
            if term in t_lower:
                groups["Brand"].append(topic)
                matched = True
                break

        if not matched:
            groups["Other"].append(topic)

    return [
        {"label": label, "topics": topics}
        for label, topics in groups.items()
        if topics
    ]


# ════════════════════════════════════════════════════════════════════════
# CONTENT & CAMPAIGN IDEAS
# ════════════════════════════════════════════════════════════════════════

def generate_content_ideas(keyword: str, change_pct: float) -> list[str]:
    k = keyword.title()
    if change_pct >= 5:
        return [
            f"Tutorial lengkap cara pakai {k} untuk pemula",
            f"Before-After: Hasil nyata pakai {k}",
            f"5 alasan kenapa {k} lagi viral sekarang",
            f"Unboxing & review jujur {k}",
            f"Tips memilih {k} yang tepat untuk kebutuhanmu",
        ]
    elif change_pct >= 0:
        return [
            f"Review mendalam {k}: Worth it atau tidak?",
            f"Perbandingan: {k} vs alternatifnya",
            f"FAQ tentang {k} yang sering ditanya",
            f"Cara maksimalkan manfaat {k}",
            f"Rekomendasi {k} terbaik tahun ini",
        ]
    else:
        return [
            f"Flash sale eksklusif {k} — stok terbatas!",
            f"Promo spesial {k}: Harga terendah minggu ini",
            f"Testimoni pelanggan setia {k}",
            f"Bundle spesial {k} + bonus gratis",
            f"Kenapa {k} masih jadi pilihan terbaik",
        ]


def generate_campaign_ideas(keyword: str) -> list[str]:
    k  = keyword.title()
    kh = keyword.replace(" ", "").title()
    return [
        f"Challenge #Coba{kh} di TikTok & Instagram Reels",
        f"Kampanye testimoni: 'Sejak pakai {k}...'",
        f"Seri edukasi 7 hari: Semua yang perlu kamu tahu tentang {k}",
        f"Giveaway: Menangkan {k} gratis untuk 3 pemenang!",
        f"Kolaborasi micro-influencer niche {k} (5K–50K followers)",
    ]


def recommend_generator(trend_score: int, content_potential: int, change_pct: float) -> str:
    if trend_score >= 75 and change_pct >= 10:
        return "reels"
    if content_potential >= 65:
        return "carousel"
    if trend_score >= 35:
        return "banner"
    return "copywriting"
