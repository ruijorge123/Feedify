import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { Sparkle, Palette, ArrowRight, Check, ArrowLeft, CreditCard, CheckCircle, Lightning } from "@phosphor-icons/react";
import ColorPicker, { firstHex } from "@/components/ColorPicker";
import {
  VISUAL_STYLES_LIST,
  BRAND_POSITIONINGS_LIST,
  BRAND_PERSONALITIES_LIST,
  BRAND_DONTS_CATEGORIES,
  useDragScroll,
} from "@/lib/brandDna";

const CATEGORIES = ["F&B / Kuliner", "Fashion / Pakaian", "Kosmetik / Skincare", "Jasa / Service", "Retail / Toko", "Edukasi", "Teknologi", "Lainnya"];

export default function OnboardingPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeDontTab, setActiveDontTab] = useState(0);

  const [form, setForm] = useState({
    brand_name: "",
    category: CATEGORIES[0],
    color_primary: "#0B3D2E",
    color_secondary: "#FDFBF7",
    visual_style: "",
    brand_positioning: "",
    brand_personality: [],
    brand_donts: [],
    target_audience: "",
    logo_base64: null,
  });

  const vsScroll = useDragScroll();
  const bpScroll = useDragScroll();
  const bnScroll = useDragScroll();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/brand-profile");
        if (data) setForm((f) => ({
          ...f, ...data,
          brand_personality: data.brand_personality || [],
          brand_donts: data.brand_donts || [],
        }));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (searchParams.get("topup") === "success") {
      toast.success("Kredit berhasil ditambahkan! Sekarang lanjutkan setup brand Anda.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const togglePersonality = (id) => {
    const list = form.brand_personality;
    if (list.includes(id)) update("brand_personality", list.filter((x) => x !== id));
    else if (list.length < 5) update("brand_personality", [...list, id]);
    else toast.info("Maksimal 5 karakter brand");
  };

  const toggleDont = (item) => {
    const list = form.brand_donts;
    update("brand_donts", list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo maksimal 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => update("logo_base64", reader.result);
    reader.readAsDataURL(file);
  };

  const next = () => {
    if (step === 1 && !form.brand_name.trim()) { toast.error("Isi nama brand dulu"); return; }
    if (step === 3) {
      if (!form.visual_style) { toast.error("Pilih Visual Style dulu"); return; }
      if (!form.brand_positioning) { toast.error("Pilih Brand Positioning dulu"); return; }
      if (!form.brand_personality.length) { toast.error("Pilih minimal 1 Brand Personality"); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    if (!form.visual_style) { toast.error("Pilih Visual Style dulu"); return; }
    if (!form.brand_positioning) { toast.error("Pilih Brand Positioning dulu"); return; }
    if (!form.brand_personality.length) { toast.error("Pilih minimal 1 Brand Personality"); return; }
    setLoading(true);
    try {
      await api.post("/brand-profile", form);
      await refreshUser();
      toast.success("Brand Profile berhasil disimpan!");
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402 && detail?.type === "no_credits" && user?.role !== "admin") {
        setShowPaywall(true);
      } else {
        toast.error(typeof detail === "string" ? detail : "Gagal menyimpan");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showPaywall) return <OnboardingPaywall userName={user?.name} />;

  const personalityCount = form.brand_personality.length;

  return (
    <div className="min-h-screen bg-brand-cream py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl brand-gradient flex items-center justify-center">
              <Sparkle size={18} weight="fill" className="text-brand-gold" />
            </div>
            <span className="font-heading text-xl font-bold text-brand">Feedify</span>
          </div>
          <button type="button" onClick={logout} data-testid="onboarding-back-button"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-brand transition-colors">
            <ArrowLeft size={16} weight="bold" /> Ganti akun
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8" data-testid="onboarding-progress">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step >= i ? "bg-brand text-brand-cream" : "bg-brand-sand text-stone-500"
              }`}>
                {step > i ? <Check size={16} weight="bold" /> : i}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${step > i ? "bg-brand" : "bg-brand-sand"}`} />}
            </div>
          ))}
        </div>

        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">
          Langkah {step} dari 3
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight mb-2">
          {step === 1 && "Kenalan dulu, yuk!"}
          {step === 2 && "Warna brand kamu"}
          {step === 3 && "Visual & identitas brand"}
        </h1>
        <p className="text-stone-600 mb-8">
          {step === 1 && "Isi info dasar brand Anda. Cukup sekali, dipakai di semua konten."}
          {step === 2 && "Dua warna ini jadi DNA visual brand kamu di setiap konten yang di-generate."}
          {step === 3 && "Tiga hal ini sangat mempengaruhi visual konten yang di-generate."}
        </p>

        <div className="feedify-card p-6 sm:p-8 animate-fade-up">

          {/* ── Step 1 ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Nama Brand">
                <input type="text" required data-testid="onboarding-brand-name"
                  value={form.brand_name} onChange={(e) => update("brand_name", e.target.value)}
                  placeholder="mis. Voyoa Skincare"
                  className="w-full px-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none" />
              </Field>
              <Field label="Kategori">
                <select data-testid="onboarding-category" value={form.category} onChange={(e) => update("category", e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Target Audiens (opsional)">
                <div className="flex flex-wrap gap-2 mb-2">
                  {["Wanita 20–35 th", "Pria urban 25–40 th", "Ibu rumah tangga", "Pelajar / Mahasiswa", "Pelaku bisnis", "Semua kalangan"].map((chip) => (
                    <button key={chip} type="button"
                      onClick={() => update("target_audience", form.target_audience === chip ? "" : chip)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all btn-touch ${
                        form.target_audience === chip ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-600 hover:border-brand-light"
                      }`}>{chip}</button>
                  ))}
                </div>
                <input type="text" data-testid="onboarding-audience"
                  value={form.target_audience} onChange={(e) => update("target_audience", e.target.value)}
                  placeholder="Atau ketik manual, mis. Wanita 20-35 tahun, urban"
                  className="w-full px-4 py-3 bg-white border border-brand-sand rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand outline-none text-sm" />
              </Field>
              <Field label="Logo (opsional, max 2MB)">
                <label htmlFor="logo-upload" data-testid="onboarding-logo-label"
                  className="flex items-center gap-4 cursor-pointer px-4 py-3 border-2 border-dashed border-brand-sand rounded-xl hover:border-brand-light transition-all">
                  <div className="h-14 w-14 rounded-xl bg-brand-sand flex items-center justify-center overflow-hidden">
                    {form.logo_base64 ? <img src={form.logo_base64} alt="logo" className="h-full w-full object-cover" /> : <Palette size={22} className="text-brand-light" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-brand">{form.logo_base64 ? "Ganti logo" : "Upload logo brand"}</div>
                    <div className="text-xs text-stone-500">PNG/JPG, transparent background lebih baik</div>
                  </div>
                </label>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} data-testid="onboarding-logo-input" />
              </Field>
            </div>
          )}

          {/* ── Step 2: Colors ─────────────────────────────────────────── */}
          {step === 2 && (
            <ColorStep
              colorPrimary={form.color_primary}
              colorSecondary={form.color_secondary}
              brandName={form.brand_name}
              onChangePrimary={(c) => update("color_primary", c)}
              onChangeSecondary={(c) => update("color_secondary", c)}
            />
          )}

          {/* ── Step 3: Visual Identity ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-8">

              {/* Visual Style — required */}
              <DragSection scroll={vsScroll}
                label="Visual Style" sub="Bentuk visual konten brand kamu di setiap posting."
                badge={<RequiredBadge filled={!!form.visual_style} label="Pilih 1 · wajib" />}>
                {VISUAL_STYLES_LIST.map((s) => (
                  <button key={s.id} type="button" data-testid={`visual-style-${s.id}`}
                    onClick={() => update("visual_style", s.id)}
                    className={`flex-shrink-0 w-40 text-left p-4 rounded-xl border-2 transition-all ${
                      form.visual_style === s.id ? "border-brand bg-brand-sand" : "border-brand-sand hover:border-brand-light bg-white"
                    }`}>
                    <div className="font-heading font-bold text-brand text-sm mb-0.5">{s.name}</div>
                    <div className="text-[11px] text-stone-500 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </DragSection>

              {/* Brand Positioning — required */}
              <DragSection scroll={bpScroll}
                label="Brand Positioning" sub="Paling mempengaruhi arah visual konten yang di-generate."
                badge={<RequiredBadge filled={!!form.brand_positioning} label="Pilih 1 · wajib" />}>
                {BRAND_POSITIONINGS_LIST.map((p) => (
                  <button key={p.id} type="button" data-testid={`positioning-${p.id}`}
                    onClick={() => update("brand_positioning", p.id)}
                    className={`flex-shrink-0 w-44 text-left p-4 rounded-xl border-2 transition-all ${
                      form.brand_positioning === p.id ? "border-brand-gold bg-brand-gold/10" : "border-brand-sand hover:border-brand-light bg-white"
                    }`}>
                    <div className="font-heading font-bold text-brand text-sm mb-0.5">{p.name}</div>
                    <div className="text-[11px] text-stone-500 leading-snug">{p.desc}</div>
                  </button>
                ))}
              </DragSection>

              {/* Brand Personality — required */}
              <DragSection scroll={bnScroll}
                label="Brand Personality" sub="Karakter visual dan komunikasi brand kamu."
                badge={
                  <RequiredBadge filled={personalityCount >= 1}
                    label={`${personalityCount}/5 · wajib min. 1`} />
                }>
                {BRAND_PERSONALITIES_LIST.map((p) => {
                  const selected = form.brand_personality.includes(p.id);
                  return (
                    <button key={p.id} type="button" data-testid={`personality-${p.id}`}
                      onClick={() => togglePersonality(p.id)}
                      className={`flex-shrink-0 w-32 text-left p-3 rounded-xl border-2 transition-all ${
                        selected ? "border-brand bg-brand-sand" : "border-brand-sand hover:border-brand-light bg-white"
                      }`}>
                      <div className="font-heading font-bold text-brand text-xs mb-0.5">{p.name}</div>
                      <div className="text-[10px] text-stone-400 leading-tight">{p.desc}</div>
                    </button>
                  );
                })}
              </DragSection>

              {/* Brand Don'ts — optional, tabbed */}
              <BrandDontsSection
                selected={form.brand_donts}
                onToggle={toggleDont}
                activeTab={activeDontTab}
                onTabChange={setActiveDontTab}
              />

            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-brand-sand">
            <button type="button" onClick={back} disabled={step === 1} data-testid="onboarding-back"
              className="px-5 py-3 rounded-full text-brand font-medium hover:bg-brand-sand disabled:opacity-30 btn-touch">
              Kembali
            </button>
            {step < 3 ? (
              <button type="button" onClick={next} data-testid="onboarding-next"
                className="px-6 py-3 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light btn-lift inline-flex items-center gap-2 btn-touch">
                Lanjut <ArrowRight size={18} weight="bold" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={loading} data-testid="onboarding-submit"
                className="px-6 py-3 bg-brand-gold text-brand rounded-full font-bold hover:bg-brand-amber btn-lift inline-flex items-center gap-2 disabled:opacity-60 btn-touch">
                {loading ? "Menyimpan..." : <>Selesai <Check size={18} weight="bold" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Color Step Component ──────────────────────────────────────────────── */
function ColorStep({ colorPrimary, colorSecondary, brandName, onChangePrimary, onChangeSecondary }) {
  return (
    <div className="space-y-5">
      {/* Live preview bar */}
      <div className="rounded-2xl overflow-hidden h-20 flex" aria-hidden>
        <div className="flex-1 flex items-center justify-center"
          style={{ background: colorPrimary }}>
          <span className="font-heading font-bold text-sm" style={{ color: colorSecondary }}>
            {brandName || "Brand Anda"}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center"
          style={{ background: colorSecondary }}>
          <span className="font-heading font-bold text-sm" style={{ color: colorPrimary }}>
            {brandName || "Brand Anda"}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-stone-400 text-center -mt-2">Preview kombinasi warna brand kamu</p>

      {/* Primary */}
      <ColorCard
        label="Warna Utama Brand"
        sub="Digunakan sebagai warna dominan identitas brand."
        color={colorPrimary}
        onChange={onChangePrimary}
        testid="color-primary"
      />

      {/* Secondary */}
      <ColorCard
        label="Warna Pendukung"
        sub="Digunakan untuk latar dan elemen pelengkap."
        color={colorSecondary}
        onChange={onChangeSecondary}
        testid="color-secondary"
      />
    </div>
  );
}

function ColorCard({ label, sub, color, onChange, testid }) {
  const hex = firstHex(color);
  return (
    <div className="rounded-2xl border border-brand-sand overflow-hidden bg-white">
      {/* Swatch strip */}
      <div className="h-14 w-full transition-colors duration-200" style={{ background: hex }} />
      <div className="p-5 pt-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-heading font-bold text-brand text-sm">{label}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>
          </div>
          <span className="flex-shrink-0 font-mono text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg border border-stone-200 tracking-wide">
            {hex.toUpperCase()}
          </span>
        </div>
        <ColorPicker color={color} onChange={onChange} testid={testid} />
      </div>
    </div>
  );
}

/* ── Brand Don'ts tabbed ───────────────────────────────────────────────── */
function BrandDontsSection({ selected, onToggle, activeTab, onTabChange }) {
  const cat = BRAND_DONTS_CATEGORIES[activeTab];
  const totalSelected = selected.length;

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="font-heading font-bold text-brand text-sm">Brand Don'ts</div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Hal yang tidak ingin muncul di visual brand kamu.{" "}
            {totalSelected > 0 && (
              <span className="text-brand font-semibold">{totalSelected} dipilih</span>
            )}
          </div>
        </div>
        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">opsional</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3">
        {BRAND_DONTS_CATEGORIES.map((c, i) => {
          const count = c.items.filter(item => selected.includes(item)).length;
          return (
            <button key={c.id} type="button" onClick={() => onTabChange(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all btn-touch ${
                activeTab === i
                  ? "bg-brand text-brand-cream border-brand"
                  : "bg-white border-brand-sand text-stone-600 hover:border-brand-light"
              }`}>
              {c.label}{count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Items for active tab */}
      <div className="bg-stone-50 rounded-xl p-4 min-h-[80px]">
        <div className="text-[10px] text-stone-400 mb-2.5">{cat.sub}</div>
        <div className="flex flex-wrap gap-2">
          {cat.items.map((item) => {
            const sel = selected.includes(item);
            return (
              <button key={item} type="button" onClick={() => onToggle(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all btn-touch ${
                  sel
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-stone-200 text-stone-600 hover:border-red-200 hover:text-red-600"
                }`}>
                {sel && "✕ "}{item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable sub-components ───────────────────────────────────────────── */
function DragSection({ scroll, label, sub, badge, children }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-heading font-bold text-brand text-sm">{label}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>
        </div>
        <div className="flex-shrink-0 mt-0.5">{badge}</div>
      </div>
      <div ref={scroll.ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-3 cursor-grab"
        onMouseDown={scroll.onMouseDown} onMouseLeave={scroll.onMouseLeave}
        onMouseUp={scroll.onMouseUp} onMouseMove={scroll.onMouseMove}>
        {children}
      </div>
    </div>
  );
}

function RequiredBadge({ filled, label }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      filled ? "bg-brand/10 text-brand" : "bg-red-50 text-red-500 border border-red-200"
    }`}>{label}</span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

/* ── Paywall ───────────────────────────────────────────────────────────── */
function OnboardingPaywall({ userName }) {
  const navigate = useNavigate();
  const firstName = userName?.split(" ")[0] || "Kamu";
  const ITEMS = [
    { label: "Feed Post / Banner", note: "1 kredit" },
    { label: "Carousel Instagram", note: "1 kredit / slide" },
    { label: "F&B Menu Visual",    note: "1 kredit" },
    { label: "Copywriting Caption", note: "Gratis" },
  ];
  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-gold/8 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="h-10 w-10 rounded-xl brand-gradient flex items-center justify-center shadow-lg shadow-brand/25">
            <Sparkle size={20} weight="fill" className="text-brand-gold" />
          </div>
          <span className="font-heading text-xl font-bold text-brand">Feedify</span>
        </div>
        <div className="bg-white rounded-3xl border border-brand-sand shadow-xl shadow-brand/8 overflow-hidden">
          <div className="brand-gradient px-8 py-7 text-brand-cream">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-brand-gold/80 mb-2">Satu langkah lagi</div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">Halo, {firstName}!<br />Aktifkan akun Anda</h1>
            <p className="text-brand-cream/70 text-sm mt-2 leading-relaxed">Brand Profile sudah siap. Top up kredit pertama Anda untuk mulai generate konten.</p>
          </div>
          <div className="px-8 py-6 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-3">1 kredit = 1 konten</div>
              <div className="space-y-2">
                {ITEMS.map(({ label, note }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={15} weight="fill" className="text-brand flex-shrink-0" />
                      <span className="text-sm text-stone-700 font-medium">{label}</span>
                    </div>
                    <span className={`text-xs font-bold ${note === "Gratis" ? "text-green-600" : "text-brand-light"}`}>{note}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 bg-brand-gold/8 border border-brand-gold/20 rounded-2xl px-5 py-4">
              <Lightning size={24} weight="fill" className="text-brand-gold flex-shrink-0" />
              <div>
                <div className="font-heading font-bold text-brand text-base">Mulai dari Rp 15.000</div>
                <div className="text-xs text-stone-500 mt-0.5">Kredit tidak expired · beli kapan saja · tanpa langganan</div>
              </div>
            </div>
            <button onClick={() => navigate("/pricing")} data-testid="paywall-goto-pricing"
              className="w-full py-4 bg-brand text-brand-cream rounded-full font-bold text-base hover:bg-brand-light btn-lift inline-flex items-center justify-center gap-2">
              <CreditCard size={18} weight="bold" /> Lihat Paket Kredit <ArrowRight size={18} weight="bold" />
            </button>
            <p className="text-center text-xs text-stone-400">
              Butuh bantuan?{" "}
              <a href="https://wa.me/6282171277376?text=Halo+Feedify,+saya+baru+daftar+dan+butuh+bantuan+topup"
                target="_blank" rel="noreferrer" className="text-brand font-semibold hover:underline">Chat via WhatsApp</a>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-stone-400 mt-6">Sudah top up?{" "}
          <button onClick={() => window.location.reload()} className="text-brand font-semibold hover:underline">Muat ulang halaman</button>
        </p>
      </div>
    </div>
  );
}
