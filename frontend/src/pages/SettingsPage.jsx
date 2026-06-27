import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from 'react-toastify';
import { Pencil, SignOut, Plus, Check, Trash, Crown, Buildings, CircleNotch, Gift, Copy, Link } from "@phosphor-icons/react";
import ColorPicker from "@/components/ColorPicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  VISUAL_STYLES_LIST,
  BRAND_POSITIONINGS_LIST,
  BRAND_PERSONALITIES_LIST,
  BRAND_DONTS_CATEGORIES,
  useDragScroll,
} from "@/lib/brandDna";

const CATEGORIES = ["F&B / Kuliner", "Fashion / Pakaian", "Kosmetik / Skincare", "Jasa / Service", "Retail / Toko", "Edukasi", "Teknologi", "Lainnya"];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(null);
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandForm, setNewBrandForm] = useState({ brand_name: "", category: CATEGORIES[0] });

  const [creatingBrand, setCreatingBrand] = useState(false);
  const [referral, setReferral] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, brandId: null, deleting: false });
  const [activeDontTab, setActiveDontTab] = useState(0);

  const vsScroll = useDragScroll();
  const bpScroll = useDragScroll();
  const bnScroll = useDragScroll();

  const loadBrands = async () => {
    try {
      const [activeRes, allRes, refRes] = await Promise.all([
        api.get("/brand-profile"),
        api.get("/brand-profiles/all"),
        api.get("/referral/my-link").catch(() => ({ data: null })),
      ]);
      setBrand(activeRes.data);
      setForm(activeRes.data);
      setBrands(allRes.data || []);
      if (refRes.data) setReferral(refRes.data);
    } catch {}
  };

  useEffect(() => { loadBrands(); }, []);

  const save = async () => {
    if (!form.visual_style) { toast.error("Pilih Visual Style dulu"); return; }
    if (!form.brand_positioning) { toast.error("Pilih Brand Positioning dulu"); return; }
    if (!form.brand_personality?.length) { toast.error("Pilih minimal 1 Brand Personality"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/brand-profile", form);
      setBrand(data);
      setEditing(false);
      toast.success("Brand profile diperbarui!");
      window.dispatchEvent(new CustomEvent("brand-updated"));
      loadBrands();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const activateBrand = async (brandId) => {
    try {
      await api.post(`/brand-profiles/${brandId}/activate`);
      toast.success("Brand diaktifkan!");
      window.dispatchEvent(new CustomEvent("brand-updated"));
      loadBrands();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengaktifkan brand");
    }
  };

  const deleteBrand = (brandId) => {
    setDeleteConfirm({ open: true, brandId, deleting: false });
  };

  const confirmDeleteBrand = async () => {
    const { brandId } = deleteConfirm;
    setDeleteConfirm((s) => ({ ...s, deleting: true }));
    try {
      await api.delete(`/brand-profiles/${brandId}`);
      toast.success("Brand dihapus");
      setDeleteConfirm({ open: false, brandId: null, deleting: false });
      loadBrands();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menghapus");
      setDeleteConfirm((s) => ({ ...s, deleting: false }));
    }
  };

  const createNewBrand = async () => {
    if (!newBrandForm.brand_name.trim()) { toast.error("Nama brand wajib diisi"); return; }
    setCreatingBrand(true);
    try {
      await api.post("/brand-profiles/create", { ...newBrandForm, color_primary: "#0B3D2E", color_secondary: "#FDFBF7", visual_style: "minimal-clean", target_audience: "" });
      toast.success("Brand baru berhasil dibuat!");
      setShowNewBrand(false);
      setNewBrandForm({ brand_name: "", category: CATEGORIES[0] });
      loadBrands();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal membuat brand");
    } finally {
      setCreatingBrand(false);
    }
  };

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (!brand) return <div className="text-stone-500 p-8">Memuat...</div>;

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Settings</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Pengaturan</h1>
      </div>

      {/* User card */}
      <div className="feedify-card p-6 flex items-center gap-4 animate-fade-up">
        <div className="h-14 w-14 rounded-full bg-brand text-brand-cream flex items-center justify-center font-heading text-xl font-bold">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading text-lg font-bold text-brand">{user?.name}</div>
          <div className="text-sm text-stone-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={logout}
          data-testid="settings-logout"
          className="px-4 py-2.5 border border-red-200 text-red-700 hover:bg-red-50 rounded-full text-sm font-semibold flex items-center gap-1.5 btn-touch"
        >
          <SignOut size={16} /> Keluar
        </button>
      </div>

      {/* Referral section */}
      {referral && (
        <div className="feedify-card p-6 animate-fade-up" data-testid="referral-section">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={20} weight="duotone" className="text-brand-gold" />
            <h2 className="font-heading text-xl font-bold text-brand">Kode Referral Kamu</h2>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            Bagikan kode atau link ini ke teman. Kamu dan teman kamu akan mendapat kredit bonus secara otomatis.
          </p>

          {/* Referral code */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center gap-3 bg-brand-sand/40 border border-brand-sand rounded-xl px-4 py-3">
              <Crown size={16} weight="fill" className="text-brand-gold flex-shrink-0" />
              <code className="font-mono font-bold text-brand text-base tracking-widest uppercase">
                {referral.code}
              </code>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(referral.code); toast.success("Kode disalin!"); }}
              data-testid="copy-referral-code"
              className="p-3 border border-brand-sand rounded-xl hover:bg-brand-sand text-stone-600 hover:text-brand btn-touch transition-all"
              title="Salin kode"
            >
              <Copy size={18} />
            </button>
          </div>

          {/* Referral link */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-brand-sand/20 border border-brand-sand rounded-xl px-3 py-2.5 min-w-0">
              <Link size={14} className="text-stone-400 flex-shrink-0" />
              <span className="text-xs text-stone-500 truncate font-mono">{referral.link}</span>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(referral.link); toast.success("Link disalin!"); }}
              data-testid="copy-referral-link"
              className="p-2.5 border border-brand-sand rounded-xl hover:bg-brand-sand text-stone-600 hover:text-brand btn-touch transition-all flex-shrink-0"
              title="Salin link"
            >
              <Copy size={15} />
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Total berhasil dipakai:</span>
            <span className="font-heading font-bold text-brand">
              {referral.referral_count ?? 0} orang
            </span>
          </div>
        </div>
      )}

      {/* Multi-brand section */}
      <div className="feedify-card p-6 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <Buildings size={20} weight="duotone" className="text-brand flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-brand truncate">Brand Profiles</h2>
            <span className="text-xs bg-brand-sand text-brand-light px-2 py-0.5 rounded-full font-semibold flex-shrink-0">{brands.length} brand</span>
          </div>
          <button
            onClick={() => setShowNewBrand(!showNewBrand)}
            data-testid="add-brand-btn"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-gold text-brand rounded-full text-sm font-semibold hover:bg-brand-amber btn-touch w-full sm:w-auto"
          >
            <Plus size={14} weight="bold" /> Tambah Brand
          </button>
        </div>

        {/* New brand form */}
        {showNewBrand && (
          <div className="mb-5 p-5 bg-brand-sand/40 rounded-2xl space-y-3 border border-brand-sand">
            <div className="font-heading text-sm font-semibold text-brand mb-1">Brand Baru</div>
            <input
              type="text"
              className="input"
              placeholder="Nama brand"
              value={newBrandForm.brand_name}
              onChange={(e) => setNewBrandForm({ ...newBrandForm, brand_name: e.target.value })}
              data-testid="new-brand-name"
            />
            <select
              className="input"
              value={newBrandForm.category}
              onChange={(e) => setNewBrandForm({ ...newBrandForm, category: e.target.value })}
              data-testid="new-brand-category"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={createNewBrand} disabled={creatingBrand} data-testid="create-brand-btn"
                className="px-5 py-2.5 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light btn-touch disabled:opacity-60">
                {creatingBrand ? "Membuat..." : "Buat Brand"}
              </button>
              <button onClick={() => setShowNewBrand(false)}
                className="px-5 py-2.5 border border-brand-sand text-stone-600 rounded-full text-sm font-semibold hover:bg-brand-sand btn-touch">
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Brand list */}
        <div className="space-y-3">
          {brands.map((b) => {
            const isActive = b.is_active || b.brand_id === brand?.brand_id || b.id === brand?.brand_id;
            const brandId = b.brand_id || b.id;
            return (
              <div
                key={brandId}
                data-testid={`brand-item-${brandId}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  isActive ? "border-brand bg-brand/5" : "border-brand-sand bg-white"
                }`}
              >
                <div
                  className="h-10 w-10 rounded-xl flex-shrink-0 border-2 border-white shadow-md"
                  style={{ background: b.color_primary || "#0B3D2E" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-brand truncate">{b.brand_name}</span>
                    {isActive && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-brand text-brand-cream px-2 py-0.5 rounded-full font-bold">
                        <Crown size={8} weight="fill" /> Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{b.category}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => activateBrand(brandId)}
                      data-testid={`activate-brand-${brandId}`}
                      className="px-3 py-1.5 bg-brand-sand text-brand rounded-full text-xs font-semibold hover:bg-brand-gold/30 btn-touch"
                    >
                      <Check size={12} weight="bold" className="inline mr-1" />Aktifkan
                    </button>
                  )}
                  {!isActive && brands.length > 1 && (
                    <button
                      onClick={() => deleteBrand(brandId)}
                      data-testid={`delete-brand-${brandId}`}
                      className="p-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-full btn-touch"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Brand Profile editor */}
      <div className="feedify-card p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl font-bold text-brand">Edit Brand Aktif</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              data-testid="edit-brand-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light btn-touch"
            >
              <Pencil size={14} weight="bold" /> Edit
            </button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-4">
            {brand.logo_base64 && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-2">Logo</div>
                <img src={brand.logo_base64} alt="logo" className="h-16 w-16 rounded-xl object-cover border border-brand-sand" />
              </div>
            )}
            <Row label="Brand Name" value={brand.brand_name} />
            <Row label="Kategori" value={brand.category} />
            {brand.target_audience && <Row label="Target Audiens" value={brand.target_audience} />}
            <Row label="Visual Style" value={
              VISUAL_STYLES_LIST.find(s => s.id === brand.visual_style)?.name || brand.visual_style
            } />
            {brand.brand_positioning && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-1">Brand Positioning</div>
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-gold/15 text-brand border border-brand-gold/30">
                  {BRAND_POSITIONINGS_LIST.find(p => p.id === brand.brand_positioning)?.name || brand.brand_positioning}
                </span>
              </div>
            )}
            {brand.brand_personality?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-2">Brand Personality</div>
                <div className="flex flex-wrap gap-1.5">
                  {brand.brand_personality.map(id => (
                    <span key={id} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-sand text-brand border border-brand/20">
                      {BRAND_PERSONALITIES_LIST.find(p => p.id === id)?.name || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {brand.brand_donts?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-2">Brand Don'ts</div>
                <div className="flex flex-wrap gap-1.5">
                  {brand.brand_donts.map(item => (
                    <span key={item} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">✕ {item}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold mb-2">Warna Brand</div>
              <div className="flex gap-3">
                {[
                  { color: brand.color_primary, label: "Utama" },
                  { color: brand.color_secondary, label: "Pendukung" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="h-14 w-14 rounded-2xl border border-stone-100 shadow-sm" style={{ background: color }} />
                    <div className="text-[10px] text-stone-500 font-medium">{label}</div>
                    <div className="text-[9px] text-stone-400 font-mono">{color}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Logo upload */}
            <Field label="Logo Brand">
              <label htmlFor="settings-logo-upload" className="flex items-center gap-4 cursor-pointer px-4 py-3 border-2 border-dashed border-brand-sand rounded-xl hover:border-brand-light transition-all">
                <div className="h-14 w-14 rounded-xl bg-brand-sand flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logo_base64
                    ? <img src={form.logo_base64} alt="logo" className="h-full w-full object-cover" />
                    : <span className="font-heading font-bold text-xl text-brand-light">{(form.brand_name?.[0] || "?").toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div className="text-sm font-semibold text-brand">{form.logo_base64 ? "Ganti logo" : "Upload logo brand"}</div>
                  <div className="text-xs text-stone-400 mt-0.5">PNG/JPG · Max 2MB · Transparan lebih baik</div>
                </div>
              </label>
              <input id="settings-logo-upload" type="file" accept="image/*" className="hidden"
                data-testid="settings-logo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) { toast.error("Logo maksimal 2MB"); return; }
                  const reader = new FileReader();
                  reader.onload = () => upd("logo_base64", reader.result);
                  reader.readAsDataURL(file);
                }}
              />
              {form.logo_base64 && (
                <button type="button" onClick={() => upd("logo_base64", null)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium">
                  Hapus logo
                </button>
              )}
            </Field>

            <Field label="Brand Name">
              <input type="text" className="input" value={form.brand_name} onChange={(e) => upd("brand_name", e.target.value)} data-testid="edit-brand-name" />
            </Field>
            <Field label="Target Audiens">
              <input type="text" className="input" value={form.target_audience || ""} onChange={(e) => upd("target_audience", e.target.value)} data-testid="edit-brand-audience" />
            </Field>

            {/* Gaya Visual — drag scroll */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-heading font-bold text-brand text-sm">Visual Style</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Bentuk visual konten brand kamu.</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                  form.visual_style ? "bg-brand/10 text-brand" : "bg-red-50 text-red-500 border border-red-200"
                }`}>Pilih 1 · wajib</span>
              </div>
              <div ref={vsScroll.ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 cursor-grab"
                onMouseDown={vsScroll.onMouseDown} onMouseLeave={vsScroll.onMouseLeave} onMouseUp={vsScroll.onMouseUp} onMouseMove={vsScroll.onMouseMove}>
                {VISUAL_STYLES_LIST.map(s => (
                  <button key={s.id} type="button" data-testid={`visual-style-${s.id}`}
                    onClick={() => upd("visual_style", s.id)}
                    className={`flex-shrink-0 w-40 text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      form.visual_style === s.id ? "border-brand bg-brand-sand" : "border-brand-sand hover:border-brand-light bg-white"
                    }`}>
                    <div className="font-heading font-semibold text-brand text-sm">{s.name}</div>
                    <div className="text-[11px] text-stone-500 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Positioning — drag scroll */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-heading font-bold text-brand text-sm">Brand Positioning</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Paling mempengaruhi arah visual konten.</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                  form.brand_positioning ? "bg-brand/10 text-brand" : "bg-red-50 text-red-500 border border-red-200"
                }`}>Pilih 1 · wajib</span>
              </div>
              <div ref={bpScroll.ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 cursor-grab"
                onMouseDown={bpScroll.onMouseDown} onMouseLeave={bpScroll.onMouseLeave} onMouseUp={bpScroll.onMouseUp} onMouseMove={bpScroll.onMouseMove}>
                {BRAND_POSITIONINGS_LIST.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => upd("brand_positioning", p.id)}
                    className={`flex-shrink-0 w-44 text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      form.brand_positioning === p.id ? "border-brand-gold bg-brand-gold/10" : "border-brand-sand hover:border-brand-light bg-white"
                    }`}>
                    <div className="font-heading font-semibold text-brand text-sm">{p.name}</div>
                    <div className="text-[11px] text-stone-500 leading-snug">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Personality — drag scroll */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-heading font-bold text-brand text-sm">Brand Personality</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Karakter visual dan komunikasi brand kamu.</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                  (form.brand_personality?.length || 0) >= 1 ? "bg-brand/10 text-brand" : "bg-red-50 text-red-500 border border-red-200"
                }`}>{form.brand_personality?.length || 0}/5 · wajib min. 1</span>
              </div>
              <div ref={bnScroll.ref} className="flex gap-2 overflow-x-auto no-scrollbar pb-2 cursor-grab"
                onMouseDown={bnScroll.onMouseDown} onMouseLeave={bnScroll.onMouseLeave} onMouseUp={bnScroll.onMouseUp} onMouseMove={bnScroll.onMouseMove}>
                {BRAND_PERSONALITIES_LIST.map(p => {
                  const selected = (form.brand_personality || []).includes(p.id);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => {
                        const list = form.brand_personality || [];
                        if (selected) upd("brand_personality", list.filter(x => x !== p.id));
                        else if (list.length < 5) upd("brand_personality", [...list, p.id]);
                        else toast.info("Maksimal 5 karakter brand");
                      }}
                      className={`flex-shrink-0 w-32 text-left p-3 rounded-xl border-2 transition-all ${
                        selected ? "border-brand bg-brand-sand" : "border-brand-sand hover:border-brand-light bg-white"
                      }`}>
                      <div className="font-semibold text-brand text-xs mb-0.5">{p.name}</div>
                      <div className="text-[10px] text-stone-400 leading-tight">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Don'ts — tabbed */}
            <SettingsDontsSection
              selected={form.brand_donts || []}
              onToggle={(item) => {
                const list = form.brand_donts || [];
                upd("brand_donts", list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
              }}
              activeTab={activeDontTab}
              onTabChange={setActiveDontTab}
            />

            {/* Warna — 2 colors only */}
            <div>
              <div className="font-heading font-bold text-brand text-sm mb-1">Warna Brand</div>
              <div className="text-[11px] text-stone-400 mb-4">Dua warna ini jadi DNA visual brand kamu di setiap konten.</div>
              <div className="space-y-4">
                <SettingsColorCard
                  label="Warna Utama Brand"
                  sub="Digunakan sebagai warna dominan identitas brand."
                  color={form.color_primary}
                  onChange={(c) => upd("color_primary", c)}
                  testid="edit-color-primary"
                  brandName={form.brand_name}
                />
                <SettingsColorCard
                  label="Warna Pendukung"
                  sub="Digunakan untuk latar dan elemen pelengkap."
                  color={form.color_secondary}
                  onChange={(c) => upd("color_secondary", c)}
                  testid="edit-color-secondary"
                  brandName={form.brand_name}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} disabled={saving} data-testid="save-brand-btn"
                className="px-6 py-3 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light btn-touch disabled:opacity-60">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => { setForm(brand); setEditing(false); }} data-testid="cancel-edit-btn"
                className="px-6 py-3 border border-brand-sand text-brand rounded-full font-semibold hover:bg-brand-sand btn-touch">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => setDeleteConfirm((s) => ({ ...s, open: v }))}
        title="Hapus brand ini?"
        description="Brand profile dan semua pengaturannya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus Brand"
        variant="danger"
        loading={deleteConfirm.deleting}
        onConfirm={confirmDeleteBrand}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
      <div className="text-xs uppercase tracking-[0.15em] text-stone-500 font-semibold sm:min-w-[140px] sm:pt-1">{label}</div>
      <div className="text-sm text-stone-800 flex-1">{value || "-"}</div>
    </div>
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

function SettingsColorCard({ label, sub, color, onChange, testid, brandName }) {
  const ref = useRef(null);
  const hex = color?.startsWith("#") ? color : "#" + color;
  return (
    <div className="rounded-2xl border border-brand-sand overflow-hidden bg-white">
      <div className="h-12 w-full transition-colors duration-200" style={{ background: hex }} />
      <div className="p-4 pt-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-heading font-bold text-brand text-sm">{label}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>
          </div>
          <span className="flex-shrink-0 font-mono text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg border border-stone-200 tracking-wide">
            {hex.toUpperCase()}
          </span>
        </div>
        <ColorPicker color={color} onChange={onChange} testid={testid} />
      </div>
    </div>
  );
}

function SettingsDontsSection({ selected, onToggle, activeTab, onTabChange }) {
  const cat = BRAND_DONTS_CATEGORIES[activeTab];
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="font-heading font-bold text-brand text-sm">Brand Don'ts</div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Hal yang tidak ingin muncul di visual brand kamu.{" "}
            {selected.length > 0 && <span className="text-brand font-semibold">{selected.length} dipilih</span>}
          </div>
        </div>
        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">opsional</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3">
        {BRAND_DONTS_CATEGORIES.map((c, i) => {
          const count = c.items.filter(item => selected.includes(item)).length;
          return (
            <button key={c.id} type="button" onClick={() => onTabChange(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all btn-touch ${
                activeTab === i ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-600 hover:border-brand-light"
              }`}>
              {c.label}{count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>
      <div className="bg-stone-50 rounded-xl p-4 min-h-[72px]">
        <div className="text-[10px] text-stone-400 mb-2.5">{cat.sub}</div>
        <div className="flex flex-wrap gap-2">
          {cat.items.map((item) => {
            const sel = selected.includes(item);
            return (
              <button key={item} type="button" onClick={() => onToggle(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all btn-touch ${
                  sel ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-stone-200 text-stone-600 hover:border-red-200 hover:text-red-600"
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
