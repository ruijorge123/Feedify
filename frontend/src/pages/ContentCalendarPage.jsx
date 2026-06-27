import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from 'react-toastify';
import { Link } from "react-router-dom";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CalendarBlank, Plus, X, CaretLeft, CaretRight,
  ImageSquare, Stack, PenNib, ForkKnife, Storefront,
  Trash, CircleNotch, LightbulbFilament,
  ArrowRight, Bell, CheckCircle, Clock, TelegramLogo,
  WhatsappLogo, Warning, CalendarPlus, Sparkle,
  Image, TextT, ArrowSquareOut, CaretDown, CaretUp,
} from "@phosphor-icons/react";

function pad(n) { return String(n).padStart(2, "0"); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAY_NAMES = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

const TYPE_ICON = {
  banner: ImageSquare, carousel: Stack, copywriting: PenNib,
  "food-menu": ForkKnife, marketplace: Storefront,
};

const STATUS_STYLE = {
  scheduled: "bg-brand text-brand-cream",
  posted: "bg-green-100 text-green-700",
  draft: "bg-stone-100 text-stone-500",
};

const STATUS_LABEL = { scheduled: "Terjadwal", posted: "Sudah Posted", draft: "Draft" };

const EMPTY_FORM = { title: "", scheduled_date: "", prompt_id: "", notes: "", status: "draft", photo_base64: null, caption: "" };

// ─── Notification panel (extracted) ──────────────────────────────
function NotifPanel() {
  const [notif, setNotif] = useState(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tgCode, setTgCode] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications/settings")
      .then(({ data }) => setNotif(data))
      .catch(() => setNotif({ telegram_chat_id: null, whatsapp_phone: null, default_reminder_hours: 24, notifications_enabled: true }));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put("/notifications/settings", notif); toast.success("Pengaturan notifikasi disimpan"); }
    catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const startTg = async () => {
    setConnecting(true);
    try { const { data } = await api.post("/notifications/telegram-start"); setTgCode(data); }
    catch { toast.error("Gagal generate kode Telegram"); }
    finally { setConnecting(false); }
  };

  if (!notif) return null;

  return (
    <div className="feedify-card overflow-hidden animate-fade-up" data-testid="notif-settings">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-sand/20 transition-colors"
        data-testid="notif-panel-toggle"
      >
        <div className="flex items-center gap-2">
          <Bell size={18} weight="duotone" className="text-brand-gold" />
          <span className="font-heading font-bold text-brand text-sm">Pengaturan Notifikasi Pengingat</span>
          {notif.notifications_enabled && (
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ON</span>
          )}
        </div>
        {open ? <CaretUp size={14} className="text-stone-400" /> : <CaretDown size={14} className="text-stone-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-brand-sand/50">
          {/* Enable toggle */}
          <div className={`mt-4 rounded-xl p-4 border-2 transition-all ${notif.notifications_enabled ? "border-brand bg-brand/5" : "border-stone-200 bg-stone-50"}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-brand text-sm">Notifikasi Pengingat</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {notif.notifications_enabled ? "Aktif — Feedify kirim reminder sebelum jadwal posting" : "Nonaktif"}
                </div>
              </div>
              <button
                onClick={() => setNotif(s => ({ ...s, notifications_enabled: !s.notifications_enabled }))}
                data-testid="notif-toggle"
                role="switch"
                aria-checked={notif.notifications_enabled}
                className={`flex-shrink-0 h-7 w-12 rounded-full transition-all duration-200 relative ${notif.notifications_enabled ? "bg-brand" : "bg-stone-300"}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${notif.notifications_enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Default reminder */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 mb-1.5 block">Waktu Pengingat Default</label>
            <select className="input text-sm" value={notif.default_reminder_hours}
              onChange={e => setNotif(s => ({ ...s, default_reminder_hours: parseInt(e.target.value) }))}
              data-testid="notif-default-reminder">
              <option value={1}>H-1 jam sebelum posting</option>
              <option value={3}>H-3 jam sebelum posting</option>
              <option value={6}>H-6 jam sebelum posting</option>
              <option value={24}>H-1 hari sebelum posting</option>
              <option value={48}>H-2 hari sebelum posting</option>
              <option value={72}>H-3 hari sebelum posting</option>
            </select>
          </div>

          {/* Telegram */}
          <div className="rounded-xl border border-stone-100 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <TelegramLogo size={16} weight="fill" className="text-[#2AABEE]" />
              <span className="font-semibold text-brand text-sm">Telegram</span>
              {notif.telegram_chat_id && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Terhubung ✓</span>}
            </div>
            {notif.telegram_chat_id ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-stone-500">Chat ID: <code className="bg-stone-100 px-1 py-0.5 rounded">{notif.telegram_chat_id}</code></div>
                <button onClick={() => setNotif(s => ({ ...s, telegram_chat_id: null }))} className="text-xs text-red-500 hover:text-red-700 font-medium" data-testid="telegram-disconnect">Putuskan</button>
              </div>
            ) : tgCode ? (
              <div className="bg-stone-50 rounded-xl p-3 space-y-1.5 text-xs text-stone-600">
                <div className="font-medium">Cara connect:</div>
                <div>1. Cari <strong>@{tgCode.bot_username}</strong> di Telegram</div>
                <div>2. Kirim: <code className="bg-white border border-stone-200 px-1 py-0.5 rounded font-mono">/connect {tgCode.code}</code></div>
                <a href={tgCode.deep_link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2AABEE] text-white rounded-full text-xs font-semibold hover:bg-[#1a96d5] mt-1">
                  <ArrowSquareOut size={11} /> Buka Telegram
                </a>
              </div>
            ) : (
              <button onClick={startTg} disabled={connecting} data-testid="telegram-connect-btn"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2AABEE] text-white rounded-full text-xs font-semibold hover:bg-[#1a96d5] disabled:opacity-60">
                {connecting ? <CircleNotch size={12} className="animate-spin" /> : <TelegramLogo size={12} weight="fill" />}
                Hubungkan Telegram
              </button>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-xl border border-stone-100 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <WhatsappLogo size={16} weight="fill" className="text-[#25D366]" />
              <span className="font-semibold text-brand text-sm">WhatsApp</span>
              {notif.whatsapp_phone && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Tersimpan ✓</span>}
            </div>
            <input type="tel" className="input text-sm" placeholder="628123456789"
              value={notif.whatsapp_phone || ""}
              onChange={e => setNotif(s => ({ ...s, whatsapp_phone: e.target.value || null }))}
              data-testid="wa-phone-input" />
          </div>

          <button onClick={save} disabled={saving} data-testid="save-notif-btn"
            className="w-full py-2.5 bg-brand text-brand-cream rounded-full text-sm font-semibold hover:bg-brand-light btn-touch disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {saving ? <><CircleNotch size={14} className="animate-spin" /> Menyimpan...</> : "Simpan Pengaturan"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function ContentCalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, scheduled_date: ymd(today) });
  const [ideas, setIdeas] = useState(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, id: null, loading: false });

  const monthStr = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;

  const load = async () => {
    try {
      const [e, p, s] = await Promise.all([
        api.get("/calendar", { params: { month: monthStr } }),
        api.get("/prompts"),
        api.get("/schedule", { params: { month: monthStr } }),
      ]);
      setEvents(e.data);
      setPrompts(p.data);
      setScheduledPosts(s.data);
    } catch {}
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [monthStr]);

  const calendarDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startOffset = first.getDay();
    const total = last.getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => { (map[e.scheduled_date] ||= []).push(e); });
    return map;
  }, [events]);

  const scheduledByDate = useMemo(() => {
    const map = {};
    scheduledPosts.forEach((p) => { (map[p.post_date] ||= []).push(p); });
    return map;
  }, [scheduledPosts]);

  const goMonth = (delta) => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  const openAdd = (date) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, scheduled_date: ymd(date) });
    setShowModal(true);
  };
  const openEdit = (ev) => {
    setEditing(ev.id);
    setForm({ ...EMPTY_FORM, ...ev, prompt_id: ev.prompt_id || "" });
    setShowModal(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo_base64: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.photo_base64) { toast.error("Upload foto dulu sebelum menyimpan"); return; }
    const payload = { ...form, prompt_id: form.prompt_id || null };
    try {
      if (editing) await api.patch(`/calendar/${editing}`, payload);
      else await api.post("/calendar", payload);
      toast.success(editing ? "Event diperbarui!" : "Event ditambahkan!");
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan");
    }
  };

  const generateIdeas = async () => {
    setGeneratingIdeas(true);
    setIdeas(null);
    setShowIdeas(true);
    try {
      const { data } = await api.post("/calendar/generate-ideas", { month: cursor.getMonth() + 1, year: cursor.getFullYear() });
      setIdeas(data);
      toast.success("30 ide konten siap!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal generate ide");
      setShowIdeas(false);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const applyIdea = (idea) => {
    const dateStr = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(idea.day)}`;
    setEditing(null);
    setForm({ ...EMPTY_FORM, title: idea.theme, scheduled_date: dateStr, notes: `${idea.content_type} · ${idea.hook}\n\nVisual: ${idea.visual_suggestion}\n${idea.hashtag_cluster}`, status: "draft" });
    setShowModal(true);
  };

  const removeEvent = (id) => setConfirmDialog({ open: true, type: "event", id, loading: false });
  const deleteSchedule = (id) => setConfirmDialog({ open: true, type: "schedule", id, loading: false });

  const handleConfirmDelete = async () => {
    const { type, id } = confirmDialog;
    setConfirmDialog((s) => ({ ...s, loading: true }));
    try {
      if (type === "event") {
        await api.delete(`/calendar/${id}`);
        toast.success("Event dihapus");
        setEvents((arr) => arr.filter((e) => e.id !== id));
        setShowModal(false);
      } else {
        await api.delete(`/schedule/${id}`);
        toast.success("Jadwal dihapus");
        setScheduledPosts((arr) => arr.filter((p) => p.id !== id));
        setSelectedPost(null);
      }
      setConfirmDialog({ open: false, type: null, id: null, loading: false });
    } catch {
      toast.error("Gagal menghapus");
      setConfirmDialog((s) => ({ ...s, loading: false }));
    }
  };

  const markPosted = async (id) => {
    try {
      await api.patch(`/schedule/${id}/mark-posted`);
      setScheduledPosts(arr => arr.map(p => p.id === id ? { ...p, status: "posted" } : p));
      setSelectedPost(sp => sp?.id === id ? { ...sp, status: "posted" } : sp);
      toast.success("Ditandai sudah posted!");
    } catch { toast.error("Gagal"); }
  };

  const promptIcon = (type) => TYPE_ICON[type] || CalendarBlank;

  return (
    <div className="space-y-6" data-testid="content-calendar-page">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-light font-semibold mb-2">Planner · Calendar</div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-brand tracking-tight">Calendar Planner</h1>
            <p className="text-stone-600 mt-2 max-w-xl">Rencanakan konten, upload foto, tulis caption — semua di satu tempat. Aktifkan notifikasi agar tidak pernah lupa posting.</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => openAdd(today)} data-testid="add-entry-btn"
              className="px-5 py-3 bg-brand text-brand-cream rounded-full font-semibold hover:bg-brand-light btn-lift inline-flex items-center gap-2 btn-touch">
              <Plus size={18} weight="bold" /> Tambah Konten
            </button>
            <button onClick={generateIdeas} disabled={generatingIdeas} data-testid="generate-ideas-btn"
              className="px-4 py-3 border-2 border-brand-sand text-brand rounded-full font-semibold hover:border-brand hover:bg-brand-sand/40 inline-flex items-center gap-2 btn-touch disabled:opacity-60">
              {generatingIdeas ? <CircleNotch size={16} className="animate-spin" /> : <Sparkle size={16} weight="fill" />}
              {generatingIdeas ? "Generating..." : "Generate Ide"}
            </button>
          </div>
        </div>
      </div>

      {/* Notification settings (collapsible) */}
      <NotifPanel />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="feedify-card p-4 sm:p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => goMonth(-1)} data-testid="prev-month" className="h-10 w-10 rounded-full hover:bg-brand-sand flex items-center justify-center text-brand btn-touch">
                <CaretLeft size={18} weight="bold" />
              </button>
              <div className="font-heading text-xl font-bold text-brand" data-testid="current-month">
                {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
              </div>
              <button onClick={() => goMonth(1)} data-testid="next-month" className="h-10 w-10 rounded-full hover:bg-brand-sand flex items-center justify-center text-brand btn-touch">
                <CaretRight size={18} weight="bold" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[10px] uppercase tracking-wider text-stone-500 font-bold text-center py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
              {calendarDays.map((d, i) => {
                if (!d) return <div key={i} className="aspect-[3/4]" />;
                const key = ymd(d);
                const evts = eventsByDate[key] || [];
                const sched = scheduledByDate[key] || [];
                const isToday = ymd(today) === key;
                const hasPending = sched.some(s => s.status === "scheduled");
                return (
                  <div key={i} className={`aspect-[3/4] p-1 rounded-xl border text-left flex flex-col ${
                    isToday ? "border-brand bg-brand-gold/10" : "border-brand-sand bg-white"
                  }`}>
                    <button onClick={() => openAdd(d)} className="w-full text-left" data-testid={`day-${key}`}>
                      <div className={`text-xs font-bold ${isToday ? "text-brand" : "text-stone-600"}`}>
                        {d.getDate()}
                        {hasPending && <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-gold align-top mt-0.5" />}
                      </div>
                    </button>

                    {/* Scheduled posts thumbnail */}
                    {sched.slice(0, 1).map((sp) => (
                      <button key={sp.id} onClick={() => setSelectedPost(sp)} className="mt-0.5 w-full rounded-lg overflow-hidden border border-brand/30 hover:border-brand transition-all" data-testid={`sched-${sp.id}`}>
                        {sp.image_base64 ? (
                          <img src={sp.image_base64.startsWith("data:") ? sp.image_base64 : `data:image/png;base64,${sp.image_base64}`} alt="" className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full aspect-square bg-brand-sand flex items-center justify-center">
                            {(() => { const Icon = TYPE_ICON[sp.dashboard_type] || ImageSquare; return <Icon size={10} weight="fill" className="text-brand-light" />; })()}
                          </div>
                        )}
                        <div className={`text-[8px] px-0.5 py-0.5 font-semibold truncate ${sp.status === "posted" ? "bg-green-50 text-green-600" : "bg-brand text-brand-cream"}`}>
                          {sp.post_time}
                        </div>
                      </button>
                    ))}

                    {/* Calendar events — show photo thumbnail if available */}
                    {evts.slice(0, sched.length > 0 ? 0 : 1).map((e) => (
                      <button key={e.id} onClick={() => openEdit(e)} className="mt-0.5 w-full rounded-lg overflow-hidden border border-brand-gold/40 hover:border-brand-gold transition-all" data-testid={`evt-${e.id}`}>
                        {e.photo_base64 ? (
                          <img src={e.photo_base64.startsWith("data:") ? e.photo_base64 : `data:image/png;base64,${e.photo_base64}`} alt="" className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full text-[8px] bg-brand-gold/20 text-brand px-1 py-0.5 font-semibold truncate text-left">
                            {e.title}
                          </div>
                        )}
                      </button>
                    ))}

                    {(evts.length + sched.length) > 2 && (
                      <div className="text-[8px] text-stone-400 mt-0.5">+{evts.length + sched.length - 1}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-[10px] text-stone-400 flex-wrap">
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-brand" /><span>Jadwal posting</span></div>
              <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-brand-gold/30 border border-brand-gold/40" /><span>Konten manual</span></div>
              <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-brand-gold" /><span>Ada reminder</span></div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4 animate-fade-up">
          {selectedPost ? (
            <ScheduledPostDetail
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
              onMarkPosted={markPosted}
              onDelete={deleteSchedule}
            />
          ) : (
            <UpcomingList
              scheduledPosts={scheduledPosts}
              events={events}
              onSelect={setSelectedPost}
              onSelectEvent={openEdit}
              today={today}
            />
          )}
        </div>
      </div>

      {/* Mobile: scheduled list */}
      <div className="lg:hidden animate-fade-up">
        <h3 className="font-heading text-lg font-bold text-brand mb-3">Jadwal Bulan Ini</h3>
        {scheduledPosts.length === 0 ? (
          <div className="feedify-card p-6 text-center text-stone-500 text-sm">
            Belum ada konten terjadwal bulan ini.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledPosts.map(sp => (
              <button key={sp.id} onClick={() => setSelectedPost(sp)} className="feedify-card p-3 w-full flex items-center gap-3 text-left hover:shadow-md transition-all">
                {sp.image_base64 ? (
                  <img src={sp.image_base64.startsWith("data:") ? sp.image_base64 : `data:image/png;base64,${sp.image_base64}`}
                    alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border border-brand-sand" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-brand-sand flex items-center justify-center flex-shrink-0">
                    {(() => { const Icon = TYPE_ICON[sp.dashboard_type] || ImageSquare; return <Icon size={18} weight="duotone" className="text-brand-light" />; })()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-brand text-sm truncate">{sp.title}</div>
                  <div className="text-xs text-stone-500">{sp.post_date} · {sp.post_time}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLE[sp.status]}`}>
                  {STATUS_LABEL[sp.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Ideas Panel */}
      {showIdeas && (
        <div className="animate-fade-up" data-testid="ideas-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LightbulbFilament size={22} weight="duotone" className="text-brand-gold" />
              <h2 className="font-heading text-xl font-bold text-brand">30 Ide Konten — {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</h2>
              {generatingIdeas && <CircleNotch size={16} className="animate-spin text-brand-light" />}
            </div>
            <button onClick={() => setShowIdeas(false)} className="h-8 w-8 rounded-full bg-brand-sand text-brand hover:bg-brand-gold/30 flex items-center justify-center font-bold">✕</button>
          </div>
          {generatingIdeas && (
            <div className="feedify-card p-8 text-center text-stone-500">
              <CircleNotch size={28} className="animate-spin mx-auto mb-3 text-brand-light" />
              <div className="text-sm">Feedify sedang buat 30 ide konten untuk brand Anda...</div>
            </div>
          )}
          {ideas && !generatingIdeas && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(ideas.ideas || []).map((idea, i) => (
                <div key={i} className="feedify-card p-4 space-y-2" data-testid={`idea-${idea.day}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-brand text-brand-cream flex items-center justify-center font-heading font-bold text-sm flex-shrink-0">{idea.day}</div>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-brand-light">{idea.content_type}</span>
                    </div>
                    <button onClick={() => applyIdea(idea)} data-testid={`use-idea-${idea.day}`}
                      className="flex-shrink-0 px-2 py-1 bg-brand-gold/20 text-brand rounded-full text-[10px] font-bold hover:bg-brand-gold/40 inline-flex items-center gap-1">
                      Pakai <ArrowRight size={10} weight="bold" />
                    </button>
                  </div>
                  <div className="font-heading text-sm font-semibold text-brand">{idea.theme}</div>
                  <div className="text-xs text-stone-600 italic">"{idea.hook}"</div>
                  {idea.hashtag_cluster && <div className="text-[10px] text-stone-400 truncate">{idea.hashtag_cluster}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event modal — tambah/edit konten manual */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-brand/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowModal(false)} data-testid="event-modal">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-brand-sand px-6 py-4 flex items-center justify-between z-10">
              <div className="font-heading text-lg font-bold text-brand">{editing ? "Edit Konten" : "Tambah Konten"}</div>
              <button onClick={() => setShowModal(false)} data-testid="close-event-modal" className="h-9 w-9 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand flex items-center justify-center">
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Foto */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2 flex items-center gap-1.5 block">
                  <Image size={13} weight="duotone" />
                  Foto Konten
                </label>
                {form.photo_base64 ? (
                  <div className="relative">
                    <img src={form.photo_base64} alt="preview" className="w-full max-h-56 object-cover rounded-xl border border-brand-sand" />
                    <button onClick={() => setForm(f => ({ ...f, photo_base64: null }))}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 hover:bg-white text-red-500 flex items-center justify-center shadow-md border border-red-100">
                      <X size={13} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-brand-sand rounded-xl cursor-pointer hover:border-brand-gold/60 hover:bg-brand-sand/20 transition-all" data-testid="photo-upload-area">
                    <Image size={24} weight="duotone" className="text-stone-300 mb-2" />
                    <span className="text-sm text-stone-400 font-medium">Klik untuk upload foto</span>
                    <span className="text-xs text-stone-300 mt-0.5">JPG, PNG — maks 5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} data-testid="photo-upload-input" />
                  </label>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 flex items-center gap-1.5 block">
                  <TextT size={13} weight="duotone" />
                  Caption
                </label>
                <textarea
                  className="input resize-none text-sm"
                  rows={4}
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  placeholder="Tulis caption Instagram di sini... #hashtag bisa langsung disertakan"
                  data-testid="event-caption"
                />
                <div className="text-right text-[10px] text-stone-400 mt-0.5">{form.caption.length} karakter</div>
              </div>

              <div className="border-t border-brand-sand/50 pt-4 space-y-4">
                {/* Judul */}
                <Field label="Judul / Label">
                  <input type="text" className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="event-title" placeholder="mis. Promo weekend, Konten edukasi..." />
                </Field>

                {/* Tanggal */}
                <Field label="Tanggal Posting">
                  <input type="date" className="input" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} data-testid="event-date" />
                </Field>

                {/* Status */}
                <Field label="Status">
                  <div className="flex gap-2 flex-wrap">
                    {["draft","scheduled","posted"].map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} data-testid={`event-status-${s}`}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border btn-touch ${form.status === s ? "bg-brand text-brand-cream border-brand" : "bg-white border-brand-sand text-stone-600"}`}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Catatan */}
                <Field label="Catatan Tambahan (opsional)">
                  <textarea className="input resize-none text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Hook, konsep visual, referensi..." />
                </Field>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                {editing && (
                  <button onClick={() => removeEvent(editing)} data-testid="delete-event-btn"
                    className="px-4 py-2.5 text-red-600 border border-red-200 rounded-full text-sm font-medium hover:bg-red-50 inline-flex items-center gap-1 btn-touch">
                    <Trash size={14} /> Hapus
                  </button>
                )}
                <button onClick={save} data-testid="save-event-btn"
                  className="flex-1 py-2.5 bg-brand text-brand-cream rounded-full font-semibold text-sm hover:bg-brand-light btn-touch">
                  {editing ? "Simpan Perubahan" : "Simpan Konten"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(v) => setConfirmDialog((s) => ({ ...s, open: v }))}
        title={confirmDialog.type === "schedule" ? "Hapus jadwal ini?" : "Hapus konten ini?"}
        description={
          confirmDialog.type === "schedule"
            ? "Jadwal posting akan dihapus. Konten di History tidak ikut terhapus."
            : "Konten kalender ini beserta foto dan caption akan dihapus permanen."
        }
        confirmLabel="Hapus"
        variant="danger"
        loading={confirmDialog.loading}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function UpcomingList({ scheduledPosts, events, onSelect, onSelectEvent, today }) {
  const todayStr = ymd(today);

  // Normalize scheduledPosts dan calendar events ke format seragam
  const fromSchedule = scheduledPosts
    .filter(sp => sp.status !== "posted")
    .map(sp => ({
      key: `s-${sp.id}`,
      date: sp.post_date,
      time: sp.post_time || "09:00",
      title: sp.title,
      photo: sp.image_base64
        ? (sp.image_base64.startsWith("data:") ? sp.image_base64 : `data:image/png;base64,${sp.image_base64}`)
        : null,
      status: sp.status,
      type: "schedule",
      raw: sp,
    }));

  const fromEvents = events
    .filter(ev => ev.status !== "posted" && ev.photo_base64)
    .map(ev => ({
      key: `e-${ev.id}`,
      date: ev.scheduled_date,
      time: "09:00",
      title: ev.title,
      photo: ev.photo_base64.startsWith("data:") ? ev.photo_base64 : `data:image/png;base64,${ev.photo_base64}`,
      status: ev.status,
      type: "event",
      raw: ev,
    }));

  const combined = [...fromSchedule, ...fromEvents]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Cari item terdekat (hari ini atau setelah hari ini)
  const nearest = combined.find(item => item.date >= todayStr);
  const rest = combined.filter(item => item !== nearest).slice(0, 4);

  const handleClick = (item) => {
    if (item.type === "schedule") onSelect(item.raw);
    else onSelectEvent(item.raw);
  };

  return (
    <div className="feedify-card p-5 space-y-4">
      <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold flex items-center gap-1.5">
        <Clock size={13} weight="fill" /> Jadwal Mendatang
      </div>

      {!nearest && combined.length === 0 ? (
        <div className="text-center py-8">
          <CalendarBlank size={32} weight="duotone" className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500 font-medium mb-1">Belum ada jadwal</p>
          <p className="text-xs text-stone-400">Klik tanggal di kalender<br/>lalu upload foto untuk mulai</p>
        </div>
      ) : (
        <>
          {/* Foto terdekat — featured */}
          {nearest && (
            <button
              onClick={() => handleClick(nearest)}
              className="w-full group text-left"
              data-testid="nearest-upcoming"
            >
              {nearest.photo ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-brand-sand aspect-square">
                  <img src={nearest.photo} alt={nearest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white font-semibold text-sm truncate">{nearest.title}</div>
                    <div className="text-white/80 text-xs mt-0.5 flex items-center gap-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${STATUS_STYLE[nearest.status]}`}>
                        {STATUS_LABEL[nearest.status]}
                      </span>
                      <span>{nearest.date}</span>
                      {nearest.date < todayStr && nearest.status === "scheduled" && (
                        <Warning size={11} weight="fill" className="text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-xl bg-brand-sand/50 border border-brand-sand p-3 flex items-center gap-3 hover:bg-brand-sand transition-all">
                  <div className="h-10 w-10 rounded-lg bg-brand-sand flex items-center justify-center flex-shrink-0">
                    <ImageSquare size={18} weight="duotone" className="text-brand-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand truncate">{nearest.title}</div>
                    <div className="text-xs text-stone-500">{nearest.date} · {nearest.time}</div>
                  </div>
                </div>
              )}
            </button>
          )}

          {/* Sisa jadwal */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              {rest.map(item => (
                <button key={item.key} onClick={() => handleClick(item)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-sand/50 transition-all text-left">
                  {item.photo ? (
                    <img src={item.photo} alt="" className="h-9 w-9 rounded-lg object-cover flex-shrink-0 border border-brand-sand" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-brand-sand flex items-center justify-center flex-shrink-0">
                      <ImageSquare size={14} weight="duotone" className="text-brand-light" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-brand truncate">{item.title}</div>
                    <div className="text-[10px] text-stone-500">{item.date}</div>
                  </div>
                  {item.date < todayStr && item.status === "scheduled" && (
                    <Warning size={12} className="text-amber-500 flex-shrink-0" weight="fill" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScheduledPostDetail({ post, onClose, onMarkPosted, onDelete }) {
  const Icon = TYPE_ICON[post.dashboard_type] || ImageSquare;
  const dataUrl = post.image_base64 ? (post.image_base64.startsWith("data:") ? post.image_base64 : `data:image/png;base64,${post.image_base64}`) : null;
  const isPosted = post.status === "posted";

  const copyCaption = () => {
    if (post.caption) { navigator.clipboard.writeText(post.caption); toast.success("Caption disalin!"); }
  };

  return (
    <div className="feedify-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-brand-light font-bold">Detail Jadwal</div>
        <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400"><X size={14} weight="bold" /></button>
      </div>

      {dataUrl ? (
        <img src={dataUrl} alt="preview" className="w-full rounded-xl object-cover aspect-square border border-brand-sand" />
      ) : (
        <div className="w-full aspect-square rounded-xl bg-brand-sand flex items-center justify-center">
          <Icon size={32} weight="duotone" className="text-brand-light" />
        </div>
      )}

      <div>
        <div className="font-heading font-bold text-brand">{post.title}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[post.status]}`}>{STATUS_LABEL[post.status]}</span>
          <span className="text-xs text-stone-500">{post.platform}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-brand-sand/50 rounded-xl p-2.5">
          <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide mb-0.5">Tanggal</div>
          <div className="font-semibold text-brand">{post.post_date}</div>
        </div>
        <div className="bg-brand-sand/50 rounded-xl p-2.5">
          <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide mb-0.5">Jam</div>
          <div className="font-semibold text-brand">{post.post_time}</div>
        </div>
      </div>

      {post.reminder_hours_before != null && (
        <div className="bg-stone-50 rounded-xl p-3 flex items-center gap-2">
          <Bell size={14} weight="duotone" className="text-brand-gold flex-shrink-0" />
          <div>
            <div className="text-[10px] text-stone-500 font-semibold uppercase tracking-wide">Reminder</div>
            <div className="text-xs text-stone-600">H-{post.reminder_hours_before < 24 ? `${post.reminder_hours_before} jam` : `${post.reminder_hours_before / 24} hari`}</div>
          </div>
          {post.reminder_sent && <CheckCircle size={14} weight="fill" className="text-green-500 ml-auto flex-shrink-0" />}
        </div>
      )}

      {post.caption && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400 mb-1.5">Caption</div>
          <div className="text-xs text-stone-700 bg-stone-50 rounded-xl p-3 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">{post.caption}</div>
          <button onClick={copyCaption} className="mt-1.5 text-xs text-brand-light hover:text-brand font-semibold">Salin caption →</button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {!isPosted && (
          <button onClick={() => onMarkPosted(post.id)} className="w-full py-2.5 bg-green-600 text-white rounded-full text-sm font-semibold hover:bg-green-700 inline-flex items-center justify-center gap-2">
            <CheckCircle size={15} weight="fill" /> Tandai Sudah Posted
          </button>
        )}
        <button onClick={() => onDelete(post.id)} className="w-full py-2.5 border border-red-200 text-red-600 rounded-full text-sm font-medium hover:bg-red-50 inline-flex items-center justify-center gap-2">
          <Trash size={14} /> Hapus Jadwal
        </button>
      </div>
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
