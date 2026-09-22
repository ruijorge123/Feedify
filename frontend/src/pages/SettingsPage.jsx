import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User, ShieldCheck, Question, SignOut, FloppyDisk, CircleNotch,
  WhatsappLogo, InstagramLogo, Plus, EnvelopeSimple, ChatCircleDots,
} from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/components/agency/Pickers";
import { useClient, setClient } from "@/lib/client";
import { useAgencyConfig, waLink } from "@/lib/agency";

const TABS = [
  { id: "profil", label: "Profil", icon: User },
  { id: "keamanan", label: "Keamanan", icon: ShieldCheck },
  { id: "bantuan", label: "Bantuan", icon: Question },
];

/**
 * Client settings, agency edition.
 *
 * The old page managed credits, plans and notification preferences — none of
 * which exist now. What is left is the data the Feedify team needs to reach this
 * client, plus the two things they may actually want to do: change a password
 * and get hold of a human.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const data = useClient();
  const cfg = useAgencyConfig();
  const [tab, setTab] = useState("profil");

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-brand sm:text-3xl">Pengaturan</h1>

      <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
              tab === id ? "bg-brand text-brand-cream" : "border border-brand-sand bg-white text-stone-500 hover:border-brand-light"
            }`}
            data-testid={`settings-tab-${id}`}
          >
            <Icon size={15} weight="duotone" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {tab === "profil" && <TabProfil user={user} data={data} />}
        {tab === "keamanan" && <TabKeamanan user={user} />}
        {tab === "bantuan" && <TabBantuan cfg={cfg} />}
      </div>

      <button
        onClick={() => { logout(); navigate("/"); }}
        className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 font-semibold text-red-600 transition-colors hover:bg-red-100"
        data-testid="settings-logout"
      >
        <SignOut size={17} weight="bold" /> Keluar dari akun
      </button>
    </div>
  );
}

/* ── profil ────────────────────────────────────────────────────────────────── */

function TabProfil({ user, data }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form || !data) return;
    const c = data.client || {};
    setForm({
      nickname: c.nickname || "",
      whatsapp: c.whatsapp || user?.whatsapp || "",
      instagram: c.instagram || "",
      tiktok: c.tiktok || "",
      store_links: c.store_links?.length ? c.store_links : [""],
      reference_accounts: c.reference_accounts?.length ? c.reference_accounts : [""],
      contact_time: c.contact_time || "",
    });
  }, [data, form, user]);

  if (!form) {
    return <div className="flex justify-center py-12"><CircleNotch size={22} className="animate-spin text-brand" /></div>;
  }

  const set = (k, v) => setForm({ ...form, [k]: v });
  const setList = (k, i, v) => { const n = [...form[k]]; n[i] = v; setForm({ ...form, [k]: n }); };
  const addList = (k) => setForm({ ...form, [k]: [...form[k], ""] });

  const save = async () => {
    if (!form.nickname.trim()) { toast.error("Nama panggilan wajib diisi"); return; }
    setSaving(true);
    try {
      const { data: res } = await api.put("/client/profile", {
        ...form,
        store_links: form.store_links.filter((s) => s.trim()),
        reference_accounts: form.reference_accounts.filter((s) => s.trim()),
      });
      setClient(res);
      toast.success("Profil tersimpan");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-3xl border border-brand-sand bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-7">
        <Field label="Mau dipanggil apa?" required hint="Nama ini muncul di dashboard dan dipakai tim kami saat chat.">
          <input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} className="feedify-input" data-testid="set-nickname" />
        </Field>

        <Field label="Email" hint="Email tidak bisa diubah — ini identitas akunmu.">
          <input value={user?.email || ""} readOnly disabled className="feedify-input cursor-not-allowed bg-stone-50 text-stone-400" />
        </Field>

        <Field label="Nomor WhatsApp" required hint="Ke nomor ini semua kontenmu dikirim.">
          <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" placeholder="0812xxxxxxx" className="feedify-input" data-testid="set-wa" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram brand">
            <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@namabrandmu" className="feedify-input" />
          </Field>
          <Field label="TikTok brand">
            <input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="@namabrandmu" className="feedify-input" />
          </Field>
        </div>

        <Field label="Link toko online">
          {form.store_links.map((s, i) => (
            <input key={i} value={s} onChange={(e) => setList("store_links", i, e.target.value)} placeholder="https://..." className="feedify-input mb-2" />
          ))}
          {form.store_links.length < 5 && (
            <button type="button" onClick={() => addList("store_links")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand">
              <Plus size={13} weight="bold" /> Tambah link
            </button>
          )}
        </Field>

        <Field label="Akun yang kontennya kamu suka" hint="Membantu tim kami menangkap seleramu.">
          {form.reference_accounts.map((s, i) => (
            <input key={i} value={s} onChange={(e) => setList("reference_accounts", i, e.target.value)} placeholder="@akunreferensi" className="feedify-input mb-2" />
          ))}
          {form.reference_accounts.length < 5 && (
            <button type="button" onClick={() => addList("reference_accounts")} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand">
              <Plus size={13} weight="bold" /> Tambah akun
            </button>
          )}
        </Field>

        <Field label="Jam enak dihubungi">
          <input value={form.contact_time} onChange={(e) => set("contact_time", e.target.value)} placeholder="Contoh: Sore setelah jam 4" className="feedify-input" />
        </Field>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-brand-cream transition-colors hover:bg-brand-light disabled:opacity-40"
        data-testid="set-simpan"
      >
        {saving ? <><CircleNotch size={16} className="animate-spin" /> Menyimpan...</> : <><FloppyDisk size={16} weight="bold" /> Simpan</>}
      </button>
    </div>
  );
}

/* ── keamanan ──────────────────────────────────────────────────────────────── */

function TabKeamanan({ user }) {
  const [sending, setSending] = useState(false);
  // Google accounts have no Feedify password to change — offering the form
  // anyway would send a reset email that resets nothing.
  const isGoogle = !user?.has_password;

  const kirim = async () => {
    setSending(true);
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      toast.success("Link ubah password sudah dikirim ke emailmu");
    } catch {
      toast.error("Gagal mengirim. Coba lagi sebentar lagi.");
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-3xl border border-brand-sand bg-white p-6 shadow-sm sm:p-8">
      {isGoogle ? (
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
            <ShieldCheck size={20} weight="duotone" className="text-brand-light" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-brand">Akunmu masuk lewat Google</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              Kamu tidak punya password Feedify — keamanan akunmu diatur di akun
              Google-mu. Tidak ada yang perlu diubah di sini.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
              <EnvelopeSimple size={20} weight="duotone" className="text-brand-light" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-brand">Ubah password</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                Kami kirimkan link ke <span className="font-medium text-brand">{user?.email}</span>.
                Buka link itu untuk membuat password baru.
              </p>
            </div>
          </div>
          <button
            onClick={kirim}
            disabled={sending}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-cream disabled:opacity-40"
            data-testid="set-ubah-password"
          >
            {sending ? <><CircleNotch size={14} className="animate-spin" /> Mengirim...</> : "Kirim link ubah password"}
          </button>
        </>
      )}
    </div>
  );
}

/* ── bantuan ───────────────────────────────────────────────────────────────── */

function TabBantuan({ cfg }) {
  const wa = waLink(cfg?.whatsapp || "6281210117905", "Halo tim Feedify, saya butuh bantuan.");
  const ig = cfg?.instagram || "feedify_id";

  return (
    <div className="space-y-4">
      <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-emerald-50">
          <WhatsappLogo size={20} weight="fill" className="text-emerald-600" />
        </div>
        <div>
          <div className="font-semibold text-brand">WhatsApp Feedify</div>
          <div className="text-xs text-stone-400">Cara tercepat — langsung ke tim yang mengerjakan kontenmu</div>
        </div>
      </a>

      <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
          <InstagramLogo size={20} weight="fill" className="text-brand-light" />
        </div>
        <div>
          <div className="font-semibold text-brand">@{ig}</div>
          <div className="text-xs text-stone-400">Lihat karya terbaru kami</div>
        </div>
      </a>

      <a href="/feedback" className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-sand">
          <ChatCircleDots size={20} weight="duotone" className="text-brand-light" />
        </div>
        <div>
          <div className="font-semibold text-brand">Kirim masukan</div>
          <div className="text-xs text-stone-400">Ada yang mengganggu atau ide untuk kami?</div>
        </div>
      </a>
    </div>
  );
}
