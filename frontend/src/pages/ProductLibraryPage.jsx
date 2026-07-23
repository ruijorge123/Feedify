import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Plus, Trash, PencilSimple, CheckCircle,
  UploadSimple, X, FloppyDisk, SpinnerGap,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import TagInput from "@/components/TagInput";

// ── Per-category config ───────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  "Skincare", "Bodycare", "Haircare", "Makeup", "Fragrance",
  "Suplemen", "Minuman", "Makanan", "Fashion", "Aksesoris", "Elektronik", "Lainnya",
];

const CATEGORY_CONFIG = {
  Skincare: {
    ingredientLabel: "Kandungan / Bahan Aktif",
    benefitLabel:    "Manfaat",
    targetLabel:     "Target Kulit",
    ingredientPlaceholder: "Tambah bahan aktif...",
    targetPlaceholder:     "Tambah target kulit...",
    ingredients: [
      "Niacinamide", "Hyaluronic Acid", "Retinol", "Vitamin C", "Ceramide",
      "Salicylic Acid", "AHA", "BHA", "Centella Asiatica", "Kojic Acid",
      "Peptide", "Collagen", "Glycerin", "Aloe Vera", "Tea Tree Oil",
      "Zinc", "Alpha Arbutin", "Tranexamic Acid", "Squalane", "Bakuchiol",
    ],
    benefits: [
      "Mencerahkan", "Melembapkan", "Anti-aging", "Mengecilkan pori",
      "Mengurangi jerawat", "Meratakan warna kulit", "Mengencangkan",
      "Menyamarkan flek", "Mengurangi kemerahan", "Melindungi dari UV",
      "Detoks kulit", "Menenangkan kulit sensitif", "Mengontrol minyak",
    ],
    targets: [
      "Kulit berminyak", "Kulit kering", "Kulit kombinasi", "Kulit sensitif",
      "Kulit normal", "Kulit berjerawat", "Kulit kusam", "Kulit gelap",
      "Kulit dewasa", "Kulit remaja",
    ],
  },
  Bodycare: {
    ingredientLabel: "Kandungan / Bahan Aktif",
    benefitLabel:    "Manfaat",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah bahan aktif...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "Shea Butter", "Coconut Oil", "Glycerin", "Vitamin E", "Aloe Vera",
      "Jojoba Oil", "Argan Oil", "Lactic Acid", "Urea", "Collagen",
      "Hyaluronic Acid", "Niacinamide", "Salicylic Acid", "Tea Tree Oil",
    ],
    benefits: [
      "Melembapkan kulit tubuh", "Mencerahkan kulit", "Menghaluskan kulit",
      "Mengangkat sel kulit mati", "Anti-stretch mark", "Mengurangi bau badan",
      "Menutrisi kulit", "Membersihkan mendalam", "Kulit terasa lembut",
      "Aroma tahan lama", "Menenangkan kulit iritasi",
    ],
    targets: [
      "Semua jenis kulit", "Kulit kering", "Kulit sensitif", "Wanita dewasa",
      "Pria", "Ibu hamil", "Remaja", "Kulit kusam", "Kulit bersisik",
    ],
  },
  Haircare: {
    ingredientLabel: "Kandungan / Bahan Aktif",
    benefitLabel:    "Manfaat",
    targetLabel:     "Target Jenis Rambut",
    ingredientPlaceholder: "Tambah bahan aktif...",
    targetPlaceholder:     "Tambah target rambut...",
    ingredients: [
      "Keratin", "Biotin", "Argan Oil", "Coconut Oil", "Castor Oil",
      "Collagen", "Panthenol (Pro-Vitamin B5)", "Niacinamide", "Caffeine",
      "Amino Acid", "Aloe Vera", "Tea Tree Oil", "Rosemary Extract",
    ],
    benefits: [
      "Menguatkan rambut", "Mengurangi kerontokan", "Melembapkan rambut",
      "Membuat rambut berkilau", "Anti-frizz", "Menutrisi akar rambut",
      "Mempercepat pertumbuhan rambut", "Mengatasi ketombe", "Rambut lebih tebal",
      "Memperbaiki ujung bercabang", "Melindungi dari panas styling",
    ],
    targets: [
      "Rambut kering", "Rambut berminyak", "Rambut keriting", "Rambut lurus",
      "Rambut rusak", "Rambut tipis", "Rambut rontok", "Kulit kepala sensitif",
      "Rambut diwarnai", "Semua jenis rambut",
    ],
  },
  Makeup: {
    ingredientLabel: "Kandungan / Formula",
    benefitLabel:    "Manfaat & Keunggulan",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah kandungan formula...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "SPF 30", "SPF 50", "Hyaluronic Acid", "Vitamin E", "Niacinamide",
      "Collagen", "Ceramide", "Titanium Dioxide", "Zinc Oxide",
      "Aloe Vera", "Mineral", "Vegan Formula", "Cruelty-free",
    ],
    benefits: [
      "Coverage tinggi", "Coverage natural", "Tahan lama 24 jam",
      "Anti-transfer", "Tidak cakey", "Waterproof", "Bebas whitecast",
      "Ringan di kulit", "Tidak menyumbat pori", "Mencerahkan tampilan",
      "Matte finish", "Dewy finish", "Glowing finish",
    ],
    targets: [
      "Kulit berminyak", "Kulit kering", "Kulit kombinasi", "Kulit sensitif",
      "Semua jenis kulit", "Pemula makeup", "Profesional", "Daily use",
    ],
  },
  Fragrance: {
    ingredientLabel: "Notes / Aroma",
    benefitLabel:    "Keunggulan & Karakter",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah notes aroma...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "Top Note: Citrus", "Top Note: Bergamot", "Top Note: Lemon",
      "Heart Note: Rose", "Heart Note: Jasmine", "Heart Note: Oud",
      "Base Note: Musk", "Base Note: Sandalwood", "Base Note: Vanilla",
      "Base Note: Amber", "Aquatic", "Woody", "Floral", "Oriental", "Fresh",
    ],
    benefits: [
      "Tahan lama 8+ jam", "Aroma lembut", "Aroma bold & kuat",
      "Cocok untuk kerja", "Cocok untuk pesta", "Cocok untuk sehari-hari",
      "Unisex", "Elegan", "Segar", "Sensual", "Mewah",
    ],
    targets: [
      "Wanita", "Pria", "Unisex", "Remaja", "Dewasa", "Profesional",
      "Casual wear", "Formal wear", "Date night",
    ],
  },
  Suplemen: {
    ingredientLabel: "Kandungan / Zat Aktif",
    benefitLabel:    "Manfaat Kesehatan",
    targetLabel:     "Target Konsumen",
    ingredientPlaceholder: "Tambah zat aktif...",
    targetPlaceholder:     "Tambah target konsumen...",
    ingredients: [
      "Vitamin C", "Vitamin D3", "Vitamin B12", "Zinc", "Magnesium",
      "Omega-3", "Kolagen", "Probiotik", "Prebiotik", "Ekstrak Temulawak",
      "Kunyit", "Jahe", "Madu", "Propolis", "Spirulina",
      "Iron (Zat Besi)", "Kalsium", "Biotin", "Ashwagandha",
    ],
    benefits: [
      "Meningkatkan imunitas", "Menambah energi", "Menjaga kesehatan sendi",
      "Mempercantik kulit dari dalam", "Mengurangi stres", "Meningkatkan stamina",
      "Kesehatan pencernaan", "Menjaga kesehatan mata", "Meningkatkan fokus",
      "Anti-oksidan", "Menjaga berat badan", "Kesehatan jantung",
    ],
    targets: [
      "Dewasa 18+", "Lansia", "Wanita hamil", "Ibu menyusui", "Atlet & sportif",
      "Pekerja kantoran", "Anak-anak", "Pria", "Wanita", "Semua usia",
    ],
  },
  Minuman: {
    ingredientLabel: "Bahan / Komposisi",
    benefitLabel:    "Manfaat & Keunggulan",
    targetLabel:     "Target Konsumen",
    ingredientPlaceholder: "Tambah bahan...",
    targetPlaceholder:     "Tambah target konsumen...",
    ingredients: [
      "Susu Sapi Segar", "Susu Oat", "Susu Almond", "Kopi Arabica", "Kopi Robusta",
      "Teh Hijau", "Teh Hitam", "Matcha", "Madu Asli", "Jahe", "Kayu Manis",
      "Buah Segar", "Collagen", "Vitamin C", "Tanpa Pengawet", "Tanpa Gula Tambahan",
    ],
    benefits: [
      "Menyegarkan", "Meningkatkan energi", "Kaya antioksidan", "Rendah kalori",
      "Tanpa gula tambahan", "Kaya protein", "Meningkatkan fokus",
      "Membantu pencernaan", "Menjaga hidrasi", "Rasa enak & nikmat",
    ],
    targets: [
      "Semua usia", "Anak-anak", "Remaja", "Dewasa", "Pekerja kantoran",
      "Atlet", "Diet & gaya hidup sehat", "Ibu hamil", "Lansia",
    ],
  },
  Makanan: {
    ingredientLabel: "Bahan / Komposisi",
    benefitLabel:    "Manfaat & Keunggulan",
    targetLabel:     "Target Konsumen",
    ingredientPlaceholder: "Tambah bahan utama...",
    targetPlaceholder:     "Tambah target konsumen...",
    ingredients: [
      "Tepung Terigu", "Tepung Beras", "Gula Aren", "Madu", "Santan",
      "Cokelat", "Keju", "Telur Segar", "Mentega", "Daging Sapi",
      "Ayam Kampung", "Ikan Segar", "Sayuran Organik", "Rempah-rempah",
      "Tanpa MSG", "Tanpa Pengawet", "Tanpa Pewarna Buatan", "Gluten-free",
    ],
    benefits: [
      "Rasa autentik", "Resep tradisional", "Bergizi tinggi", "Tinggi protein",
      "Rendah kalori", "Tanpa bahan pengawet", "Cocok untuk diet",
      "Lezat & gurih", "Praktis & siap saji", "Halal bersertifikat",
      "Ramah lingkungan", "Produksi lokal",
    ],
    targets: [
      "Semua usia", "Keluarga", "Anak-anak", "Dewasa", "Pecinta kuliner",
      "Diet sehat", "Vegan / Vegetarian", "Atlet", "Ibu rumah tangga",
    ],
  },
  Fashion: {
    ingredientLabel: "Material / Bahan",
    benefitLabel:    "Keunggulan & Keistimewaan",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah material...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "Katun 100%", "Katun Combed 30s", "Rayon Viscose", "Linen", "Polyester",
      "Nilon", "Suede", "Kulit Asli", "Kulit Sintetis", "Denim",
      "Batik Tulis", "Batik Cap", "Tenun ATBM", "Organza", "Sifon",
    ],
    benefits: [
      "Nyaman dipakai seharian", "Anti-kusut", "Mudah dicuci",
      "Adem & breathable", "Stretch & fleksibel", "Premium quality",
      "Warna tidak mudah pudar", "Handmade", "Limited edition",
      "Sustainable & eco-friendly", "Ukuran all size",
    ],
    targets: [
      "Wanita", "Pria", "Unisex", "Remaja", "Dewasa", "Plus size",
      "Kantor & formal", "Casual harian", "Pesta & acara", "Olahraga",
    ],
  },
  Aksesoris: {
    ingredientLabel: "Material / Bahan",
    benefitLabel:    "Keunggulan",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah material...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "Stainless Steel 316L", "Sterling Silver 925", "Emas 18K", "Emas 24K",
      "Titanium", "Kulit Asli", "Kulit Sintetis", "Kanvas",
      "Anti-karat", "Anti-alergi", "Tahan Air",
    ],
    benefits: [
      "Tahan lama", "Anti-karat", "Anti-alergi", "Tidak mudah luntur",
      "Elegan & stylish", "Ringan", "Serbaguna", "Premium quality",
      "Handmade", "Limited edition",
    ],
    targets: [
      "Wanita", "Pria", "Unisex", "Remaja", "Dewasa",
      "Casual", "Formal", "Pesta", "Hadiah / Gift",
    ],
  },
  Elektronik: {
    ingredientLabel: "Spesifikasi Utama",
    benefitLabel:    "Keunggulan & Fitur",
    targetLabel:     "Target Pengguna",
    ingredientPlaceholder: "Tambah spesifikasi...",
    targetPlaceholder:     "Tambah target pengguna...",
    ingredients: [
      "Baterai 5000mAh", "Fast Charging 65W", "Layar AMOLED", "Kamera 108MP",
      "Prosesor Snapdragon", "RAM 8GB", "Storage 256GB", "5G Ready",
      "WiFi 6", "Bluetooth 5.3", "NFC", "Waterproof IP68",
    ],
    benefits: [
      "Baterai tahan lama", "Pengisian cepat", "Layar jernih & tajam",
      "Kamera berkualitas tinggi", "Performa cepat", "Ringan & tipis",
      "Desain premium", "Garansi resmi", "Hemat energi",
    ],
    targets: [
      "Mahasiswa", "Pekerja kantoran", "Gamer", "Content creator",
      "Fotografer", "Remaja", "Profesional", "Semua usia",
    ],
  },
  Lainnya: {
    ingredientLabel: "Kandungan / Komponen",
    benefitLabel:    "Manfaat & Keunggulan",
    targetLabel:     "Target Konsumen",
    ingredientPlaceholder: "Tambah kandungan...",
    targetPlaceholder:     "Tambah target...",
    ingredients: [],
    benefits: [
      "Berkualitas tinggi", "Tahan lama", "Mudah digunakan", "Praktis",
      "Nilai untuk uang terbaik", "Handmade", "Limited edition",
    ],
    targets: [
      "Semua usia", "Wanita", "Pria", "Remaja", "Dewasa",
      "Keluarga", "Profesional",
    ],
  },
};

const DEFAULT_CONFIG = CATEGORY_CONFIG["Skincare"];

function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", category: "", photo_base64: null,
  ingredients: [], benefits: [], target_skin: [], usp: "",
};

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="feedify-card p-4 flex flex-col gap-3" data-testid="product-card">
      {/* Photo */}
      <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center">
        {product.photo_base64 ? (
          <img
            src={product.photo_base64}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package size={32} weight="duotone" className="text-stone-300" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <p className="font-bold text-sm text-stone-800 truncate">{product.name}</p>
        {product.category && (
          <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-brand/8 text-brand">
            {product.category}
          </span>
        )}
        {product.usp && (
          <p className="text-xs text-stone-500 line-clamp-2">{product.usp}</p>
        )}
      </div>

      {/* Tags preview */}
      {product.benefits?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.benefits.slice(0, 3).map((b) => (
            <span key={b} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
              {b}
            </span>
          ))}
          {product.benefits.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
              +{product.benefits.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:border-brand/50 hover:text-brand transition-all"
          data-testid="edit-product-btn"
        >
          <PencilSimple size={13} weight="bold" /> Edit
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:border-red-300 hover:text-red-500 transition-all"
          data-testid="delete-product-btn"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ── ProductForm (add / edit) ──────────────────────────────────────────────────
function ProductForm({ initial = EMPTY_FORM, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const [removingBg, setRemovingBg] = useState(false);
  const photoRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const catCfg = getCategoryConfig(form.category);

  const handlePhoto = useCallback(async (file) => {
    if (!file) return;
    const b64 = await toBase64(file);
    set("photo_base64", b64);
    // Auto remove background
    try {
      setRemovingBg(true);
      const { data } = await api.post("/products/remove-bg", { photo_base64: b64 });
      set("photo_base64", data.photo_base64);
      toast.success("Background otomatis dihapus!");
    } catch {
      // Silently keep original if remove-bg fails
    } finally {
      setRemovingBg(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo upload */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          Foto Produk
        </label>
        <div
          onClick={() => photoRef.current?.click()}
          className="relative h-40 rounded-2xl border-2 border-dashed border-stone-200 hover:border-brand/50 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-stone-50"
          data-testid="product-photo-upload"
        >
          {form.photo_base64 ? (
            <>
              <img src={form.photo_base64} alt="" className="w-full h-full object-contain" />
              {removingBg && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2 text-sm text-brand font-semibold">
                  <SpinnerGap size={18} className="animate-spin" /> Hapus background...
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-stone-400">
              <UploadSimple size={28} weight="duotone" />
              <span className="text-xs font-medium">Upload foto produk</span>
              <span className="text-[10px]">Background otomatis dihapus</span>
            </div>
          )}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhoto(e.target.files[0])}
          data-testid="product-photo-input"
        />
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          Nama Produk *
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60"
          placeholder="e.g. Brightening Serum 30ml"
          required
          data-testid="product-name-input"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          Kategori
        </label>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 bg-white"
          data-testid="product-category-select"
        >
          <option value="">Pilih kategori</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* USP */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          USP / Keunggulan Utama
        </label>
        <textarea
          value={form.usp}
          onChange={(e) => set("usp", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/60 resize-none"
          placeholder="Apa yang membuat produk ini unik?"
          rows={2}
          data-testid="product-usp-input"
        />
      </div>

      {/* Ingredients */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          {catCfg.ingredientLabel}
        </label>
        <TagInput
          value={form.ingredients}
          onChange={(v) => set("ingredients", v)}
          suggestions={catCfg.ingredients}
          placeholder={catCfg.ingredientPlaceholder}
        />
      </div>

      {/* Benefits */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          {catCfg.benefitLabel}
        </label>
        <TagInput
          value={form.benefits}
          onChange={(v) => set("benefits", v)}
          suggestions={catCfg.benefits}
          placeholder="Tambah manfaat..."
        />
      </div>

      {/* Target */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 block">
          {catCfg.targetLabel}
        </label>
        <TagInput
          value={form.target_skin}
          onChange={(v) => set("target_skin", v)}
          suggestions={catCfg.targets}
          placeholder={catCfg.targetPlaceholder}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-all"
          data-testid="cancel-product-btn"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-brand-cream text-sm font-semibold hover:bg-brand-light disabled:opacity-50 transition-all"
          data-testid="save-product-btn"
        >
          {loading ? (
            <SpinnerGap size={16} className="animate-spin" />
          ) : (
            <FloppyDisk size={16} weight="bold" />
          )}
          Simpan Produk
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductLibraryPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState("list"); // "list" | "add" | "edit"
  const [editing, setEditing] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/products");
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post("/products", body),
    onSuccess: () => {
      toast.success("Produk berhasil disimpan!");
      qc.invalidateQueries({ queryKey: ["products"] });
      setMode("list");
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Gagal simpan produk"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/products/${id}`, body),
    onSuccess: () => {
      toast.success("Produk diperbarui!");
      qc.invalidateQueries({ queryKey: ["products"] });
      setMode("list");
      setEditing(null);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Gagal update produk"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("Produk dihapus");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Gagal hapus produk"),
  });

  const handleEdit = (product) => {
    setEditing(product);
    setMode("edit");
  };

  const handleDelete = (id) => {
    if (!window.confirm("Hapus produk ini?")) return;
    deleteMut.mutate(id);
  };

  const handleSave = (form) => {
    if (mode === "edit" && editing) {
      updateMut.mutate({ id: editing.id, body: form });
    } else {
      createMut.mutate(form);
    }
  };

  const mutLoading = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6 pb-16" data-testid="product-library-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand">Product Library</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Simpan data produkmu agar Feedify bisa generate konten otomatis
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={() => setMode("add")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand text-brand-cream text-sm font-semibold hover:bg-brand-light transition-all shadow-sm shadow-brand/20"
            data-testid="add-product-btn"
          >
            <Plus size={16} weight="bold" /> Tambah Produk
          </button>
        )}
      </div>

      {/* Form panel */}
      {(mode === "add" || mode === "edit") && (
        <div className="feedify-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-lg text-brand">
              {mode === "add" ? "Tambah Produk Baru" : "Edit Produk"}
            </h2>
            <button
              onClick={() => { setMode("list"); setEditing(null); }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
          <ProductForm
            initial={mode === "edit" ? editing : EMPTY_FORM}
            onSave={handleSave}
            onCancel={() => { setMode("list"); setEditing(null); }}
            loading={mutLoading}
          />
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <SpinnerGap size={32} className="animate-spin text-brand" />
        </div>
      ) : products.length === 0 && mode === "list" ? (
        <div className="feedify-card p-12 flex flex-col items-center text-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(11,61,46,0.1), rgba(229,193,88,0.12))" }}
          >
            <Package size={36} weight="duotone" className="text-brand" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-brand text-lg mb-1">Belum ada produk</h3>
            <p className="text-stone-500 text-sm max-w-xs">
              Tambahkan produk pertamamu agar Feedify bisa generate konten banner, feed, dan carousel yang lebih akurat.
            </p>
          </div>
          <button
            onClick={() => setMode("add")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-brand-cream text-sm font-semibold hover:bg-brand-light transition-all"
            data-testid="add-first-product-btn"
          >
            <Plus size={16} weight="bold" /> Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
