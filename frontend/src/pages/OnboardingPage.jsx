import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowRight, ArrowLeft, Check, CircleNotch, UploadSimple, X, Plus,
  Trash, Package, CheckCircle,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import FeedifyLogo from "@/components/FeedifyLogo";
import BrandDnaForm from "@/components/agency/BrandDnaForm";
import { Field } from "@/components/agency/Pickers";
import { compressImageFile } from "@/lib/imageCompress";
import { emptyBrandDna } from "@/lib/brandDna";
import { fetchClient, setClient } from "@/lib/client";

const STEPS = ["Data diri", "Brand DNA", "Produk & Pembagian"];

/**
 * Post-payment onboarding.
 *
 * Four steps, saved one at a time rather than all at the end: a client filling
 * this on a phone will get interrupted, and losing twenty answers to a dropped
 * connection is how someone decides the product is broken. Each step writes to
 * its own endpoint and the wizard resumes from wherever they stopped.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const [profil, setProfil] = useState({
    nickname: "", instagram: "", tiktok: "",
    store_links: [""], reference_accounts: [""], contact_time: "",
  });
  const [dna, setDna] = useState(emptyBrandDna());
  const [products, setProducts] = useState([]);
  const [alloc, setAlloc] = useState({});
  const [totalFeeds, setTotalFeeds] = useState(0);

  // Resume where they left off instead of restarting the wizard every visit.
  useEffect(() => {
    (async () => {
      const data = await fetchClient(true);
      if (data) {
        const c = data.client || {};
        setTotalFeeds(c.total_feeds || 0);
        setProfil((p) => ({
          ...p,
          nickname: c.nickname || "",
          instagram: c.instagram || "",
          tiktok: c.tiktok || "",
          contact_time: c.contact_time || "",
          store_links: c.store_links?.length ? c.store_links : [""],
          reference_accounts: c.reference_accounts?.length ? c.reference_accounts : [""],
        }));
        if (data.brand) setDna({ ...emptyBrandDna(), ...data.brand });
        setProducts(data.products || []);
        setAlloc(Object.fromEntries((data.products || []).map((p) => [p.id, p.allocation || 0])));

        const k = data.kelengkapan || {};
        if (!k.profil) setStep(0);
        else if (!k.brand_dna) setStep(1);
        else setStep(2);
      }
      setLoading(false);
    })();
  }, []);

  const terpakai = useMemo(
    () => Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0),
    [alloc]
  );

  // ── saves ──────────────────────────────────────────────────────────────────

  const saveProfil = async () => {
    if (!profil.nickname.trim()) { toast.error("Nama panggilan wajib diisi"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/client/profile", {
        ...profil,
        store_links: profil.store_links.filter((s) => s.trim()),
        reference_accounts: profil.reference_accounts.filter((s) => s.trim()),
      });
      setClient(data);
      setStep(1);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const saveDna = async () => {
    if (!dna.brand_name.trim()) { toast.error("Nama brand wajib diisi"); return; }
    if (!dna.mood) { toast.error("Pilih dulu kontenmu mau terasa seperti apa"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/client/brand-dna", dna);
      setClient(data);
      setStep(2);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const reloadProducts = async () => {
    const { data } = await api.get("/client/products");
    setProducts(data);
    setAlloc((prev) => Object.fromEntries(data.map((p) => [p.id, prev[p.id] ?? p.allocation ?? 0])));
  };

  const saveAlloc = async () => {
    if (!products.length) { toast.error("Tambahkan minimal satu produk"); return; }
    // No package yet (payment not approved, or the owner testing) — there is
    // nothing to split, so finishing must not be blocked on a sum of zero.
    if (totalFeeds > 0 && terpakai !== totalFeeds) {
      toast.error(`Pembagian harus pas ${totalFeeds} feed (sekarang ${terpakai})`);
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put("/client/allocation", { allocation: alloc });
      setClient(data);
      // Saving the Brand DNA flipped has_brand_profile in the database, but the
      // cached user object still says false — and ProtectedRoute reads the cache,
      // so "Buka Dashboard" would bounce straight back here. Refresh before
      // showing the door.
      await refreshUser();
      setDone(true);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream">
        <CircleNotch size={26} className="animate-spin text-brand" />
      </div>
    );
  }

  if (done) {
    return (
      <SelesaiScreen
        onGo={async () => { await refreshUser(); navigate("/dashboard", { replace: true }); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* header + progress */}
      <div className="bg-brand-terminal px-5 pb-8 pt-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <FeedifyLogo size={32} tone="light" />
            <span className="text-xs text-brand-cream/45">
              Langkah {step + 1} dari {STEPS.length}
            </span>
          </div>

          <div className="mt-7 flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i <= step ? "bg-brand-gold" : "bg-white/15"}`} />
                <div className={`mt-2 text-[10px] ${i <= step ? "text-brand-cream/70" : "text-brand-cream/30"}`}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8">
        {step === 0 && (
          <Card
            title={`Halo${user?.name ? `, ${user.name.split(" ")[0]}` : ""} — kenalan dulu`}
            desc="Supaya tim kami tahu harus memanggilmu apa dan ke mana harus melihat akunmu."
          >
            <StepProfil value={profil} onChange={setProfil} />
          </Card>
        )}

        {step === 1 && (
          <Card
            title="Brand DNA"
            desc="Ini yang membuat semua kontenmu terlihat satu keluarga. Diisi sekali, dipakai selamanya — dan bisa kamu ubah kapan saja."
          >
            <BrandDnaForm value={dna} onChange={setDna} />
          </Card>
        )}

        {step === 2 && (
          <Card
            title="Produk & pembagian feed"
            desc={totalFeeds > 0
              ? `Tambahkan produk yang mau digarap, lalu bagi ${totalFeeds} feed paketmu ke masing-masing. Foto boleh dari HP — yang penting produknya terlihat jelas.`
              : "Tambahkan produk yang mau digarap. Foto boleh dari HP — yang penting produknya terlihat jelas. Pembagian jatah feed muncul setelah paketmu aktif."}
          >
            <StepProduk
              products={products}
              onReload={reloadProducts}
              alloc={alloc}
              setAlloc={setAlloc}
              total={totalFeeds}
              terpakai={terpakai}
            />
          </Card>
        )}

        {/* nav */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-stone-500 transition-colors hover:text-brand"
              data-testid="onboarding-back"
            >
              <ArrowLeft size={15} weight="bold" /> Kembali
            </button>
          ) : <span />}

          <button
            onClick={
              step === 0 ? saveProfil
              : step === 1 ? saveDna
              : saveAlloc
            }
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream transition-all hover:bg-brand-light disabled:opacity-40"
            data-testid="onboarding-next"
          >
            {saving ? <><CircleNotch size={16} className="animate-spin" /> Menyimpan...</>
              : step === 2 ? <>Selesai <Check size={16} weight="bold" /></>
              : <>Lanjut <ArrowRight size={16} weight="bold" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── steps ─────────────────────────────────────────────────────────────────── */

function StepProfil({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const setList = (k, i, v) => {
    const next = [...value[k]];
    next[i] = v;
    onChange({ ...value, [k]: next });
  };
  const addList = (k) => onChange({ ...value, [k]: [...value[k], ""] });

  return (
    <div className="space-y-7">
      <Field label="Mau dipanggil apa?" required hint="Nama ini yang muncul di dashboard dan dipakai tim kami saat chat.">
        <input
          value={value.nickname}
          onChange={(e) => set("nickname", e.target.value)}
          placeholder="Contoh: Kak Rina, Bu Sari, Bang Adi"
          className="feedify-input"
          data-testid="onb-nickname"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Instagram brand">
          <input value={value.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@namabrandmu" className="feedify-input" data-testid="onb-ig" />
        </Field>
        <Field label="TikTok brand">
          <input value={value.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="@namabrandmu" className="feedify-input" data-testid="onb-tiktok" />
        </Field>
      </div>

      <Field label="Link toko online" hint="Shopee, Tokopedia, TikTok Shop, atau website sendiri.">
        {value.store_links.map((s, i) => (
          <input
            key={i}
            value={s}
            onChange={(e) => setList("store_links", i, e.target.value)}
            placeholder="https://shopee.co.id/namatokomu"
            className="feedify-input mb-2"
          />
        ))}
        {value.store_links.length < 5 && (
          <button type="button" onClick={() => addList("store_links")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand">
            <Plus size={13} weight="bold" /> Tambah link
          </button>
        )}
      </Field>

      <Field
        label="Akun yang kontennya kamu suka"
        hint="Akun brand lain yang gayanya kamu kagumi. Ini sangat membantu kami menangkap selera kamu."
      >
        {value.reference_accounts.map((s, i) => (
          <input
            key={i}
            value={s}
            onChange={(e) => setList("reference_accounts", i, e.target.value)}
            placeholder="@akunyangkamusuka"
            className="feedify-input mb-2"
          />
        ))}
        {value.reference_accounts.length < 5 && (
          <button type="button" onClick={() => addList("reference_accounts")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand">
            <Plus size={13} weight="bold" /> Tambah akun
          </button>
        )}
      </Field>

      <Field label="Jam enak dihubungi" hint="Supaya tim kami tidak chat saat kamu sedang sibuk.">
        <input
          value={value.contact_time}
          onChange={(e) => set("contact_time", e.target.value)}
          placeholder="Contoh: Sore setelah jam 4, atau weekend saja"
          className="feedify-input"
          data-testid="onb-jam"
        />
      </Field>
    </div>
  );
}

function StepProduk({ products, onReload, alloc, setAlloc, total, terpakai }) {
  const [form, setForm] = useState({ name: "", description: "", photo_base64: null });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const sisa = total - terpakai;

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    try {
      const photo = await compressImageFile(file, { maxDimension: 1280, quality: 0.85 });
      setForm((f) => ({ ...f, photo_base64: photo }));
    } catch { toast.error("Gagal membaca foto"); }
  };

  const add = async () => {
    if (!form.name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setBusy(true);
    try {
      await api.post("/client/products", form);
      setForm({ name: "", description: "", photo_base64: null });
      if (fileRef.current) fileRef.current.value = "";
      await onReload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menambah produk");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/client/products/${id}`); await onReload(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const setOne = (id, n) => setAlloc({ ...alloc, [id]: Math.max(0, Number(n) || 0) });

  // Nudges the basket onto the package total without making them do the maths.
  const bagiRata = () => {
    if (!products.length) return;
    const dasar = Math.floor(total / products.length);
    const lebih = total - dasar * products.length;
    setAlloc(Object.fromEntries(products.map((p, i) => [p.id, dasar + (i < lebih ? 1 : 0)])));
  };

  return (
    <div>
      {/* Running total sits above the list: the split is only correct as a whole,
          so the number that matters is the basket, not any single row. */}
      {products.length > 0 && total === 0 && (
        <div className="mb-5 rounded-2xl border border-brand-sand bg-brand-sand/40 p-4 text-sm text-stone-500">
          Jatah feed belum aktif. Setelah pembayaranmu dikonfirmasi, kamu bisa mengatur
          berapa feed untuk tiap produk di menu <span className="font-semibold text-brand">Produk Saya</span>.
        </div>
      )}

      {products.length > 0 && total > 0 && (
        <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
          sisa === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`} data-testid="onb-alokasi-ringkasan">
          <div>
            <div className={`text-sm font-semibold ${sisa === 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {sisa === 0 ? "Pas! Pembagian sudah benar." : sisa > 0 ? `Kurang ${sisa} feed lagi` : `Kelebihan ${-sisa} feed`}
            </div>
            <div className={`text-xs ${sisa === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              Terpakai {terpakai} dari {total} feed
            </div>
          </div>
          <button onClick={bagiRata} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:border-brand">
            Bagi rata
          </button>
        </div>
      )}

      {products.length > 0 && (
        <div className="mb-8 space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-brand-sand">
                {p.photo_base64
                  ? <img src={p.photo_base64} alt={p.name} className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center"><Package size={18} weight="duotone" className="text-brand-light" /></div>}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-brand">{p.name}</div>
                {p.description && <div className="truncate text-xs text-stone-400">{p.description}</div>}
                <div className={`mt-1.5 items-center gap-2 ${total > 0 ? "flex" : "hidden"}`}>
                  <button onClick={() => setOne(p.id, (alloc[p.id] || 0) - 1)} className="grid h-6 w-6 place-items-center rounded-full border border-brand-sand text-xs text-brand hover:bg-brand-sand" aria-label="Kurangi">−</button>
                  <input
                    value={alloc[p.id] ?? 0}
                    onChange={(e) => setOne(p.id, e.target.value)}
                    inputMode="numeric"
                    className="w-12 rounded-lg border border-brand-sand py-1 text-center text-sm font-bold text-brand"
                    data-testid={`onb-alokasi-${p.id}`}
                  />
                  <button onClick={() => setOne(p.id, (alloc[p.id] || 0) + 1)} className="grid h-6 w-6 place-items-center rounded-full border border-brand-sand text-xs text-brand hover:bg-brand-sand" aria-label="Tambah">+</button>
                  <span className="text-[11px] text-stone-400">feed</span>
                </div>
              </div>

              <button onClick={() => remove(p.id)} className="flex-shrink-0 p-2 text-stone-300 transition-colors hover:text-red-500" aria-label="Hapus produk">
                <Trash size={16} weight="duotone" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border-2 border-dashed border-brand-sand p-5">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Tambah produk</div>

        <div className="mt-4 flex gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-24 w-24 flex-shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-brand-gold/50 bg-brand-gold/5 transition-colors hover:border-brand-gold"
            data-testid="onb-produk-foto"
          >
            {form.photo_base64
              ? <img src={form.photo_base64} alt="" className="h-full w-full object-cover" />
              : <UploadSimple size={20} weight="duotone" className="text-brand-gold" />}
          </button>
          <div className="flex-1 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama produk"
              className="feedify-input"
              data-testid="onb-produk-nama"
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Keterangan singkat (opsional)"
              className="feedify-input"
            />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        <button
          onClick={add}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-sand px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-cream disabled:opacity-40"
          data-testid="onb-produk-tambah"
        >
          {busy ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />} Tambah
        </button>
        <p className="mt-3 text-xs text-stone-400">Produk baru mulai dari 0 feed — atur jatahnya di daftar atas.</p>
      </div>
    </div>
  );
}

/* ── chrome ────────────────────────────────────────────────────────────────── */

function Card({ title, desc, children }) {
  return (
    <div className="rounded-3xl border border-brand-sand bg-white p-6 shadow-sm sm:p-9">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">{title}</h1>
      {desc && <p className="mt-3 max-w-xl leading-relaxed text-stone-500">{desc}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function SelesaiScreen({ onGo }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand px-5 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gold">
          <CheckCircle size={32} weight="fill" className="text-brand" />
        </div>
        <h1 className="mt-7 font-heading text-3xl font-bold tracking-tight text-brand-cream">Datamu lengkap!</h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-brand-cream/60">
          Tim Feedify sudah menerima brief-mu dan akan menghubungi lewat WhatsApp untuk
          memulai. Sambil menunggu, kamu bisa lihat ringkasannya di dashboard.
        </p>
        <button
          onClick={onGo}
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-brand-gold px-8 py-4 font-semibold text-brand transition-all hover:-translate-y-0.5 hover:bg-brand-amber"
          data-testid="onboarding-selesai"
        >
          Buka Dashboard <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
