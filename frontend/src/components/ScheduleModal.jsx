import { useState } from "react";
import { X, CalendarBlank, Clock, Bell, CheckCircle, CircleNotch, TelegramLogo, WhatsappLogo } from "@phosphor-icons/react";
import api from "@/lib/api";
import { toast } from 'react-toastify';

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "tokopedia", label: "Tokopedia" },
  { id: "shopee", label: "Shopee" },
];

const REMINDER_OPTIONS = [
  { value: 1, label: "H-1 jam sebelum" },
  { value: 3, label: "H-3 jam sebelum" },
  { value: 6, label: "H-6 jam sebelum" },
  { value: 24, label: "H-1 (1 hari sebelum)" },
  { value: 48, label: "H-2 (2 hari sebelum)" },
  { value: 72, label: "H-3 (3 hari sebelum)" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function ScheduleModal({ open, onClose, promptId, imageBase64, dashboardType, defaultCaption = "", defaultTitle = "" }) {
  const [form, setForm] = useState({
    title: defaultTitle,
    caption: defaultCaption,
    platform: "instagram",
    post_date: todayStr(),
    post_time: "09:00",
    reminder_hours_before: 24,
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul konten wajib diisi"); return; }
    if (!form.post_date) { toast.error("Pilih tanggal posting"); return; }
    setSaving(true);
    try {
      await api.post("/schedule", {
        prompt_id: promptId || null,
        title: form.title,
        caption: form.caption,
        platform: form.platform,
        post_date: form.post_date,
        post_time: form.post_time,
        reminder_hours_before: form.reminder_hours_before,
        dashboard_type: dashboardType || "banner",
        image_base64: imageBase64 || null,
      });
      setDone(true);
      toast.success("Konten terjadwal! Kamu akan dapat notifikasi pengingat.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menjadwalkan");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setDone(false); onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={reset} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-stone-100">
          <div className="h-9 w-9 rounded-xl bg-brand-sand flex items-center justify-center flex-shrink-0">
            <CalendarBlank size={18} weight="duotone" className="text-brand" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-lg font-bold text-brand">Jadwalkan Konten</h2>
            <p className="text-xs text-stone-500">Atur tanggal & notifikasi pengingat posting</p>
          </div>
          <button onClick={reset} className="h-9 w-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400">
            <X size={18} weight="bold" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} weight="fill" className="text-green-600" />
            </div>
            <h3 className="font-heading font-bold text-xl text-brand mb-2">Terjadwal!</h3>
            <p className="text-stone-600 text-sm mb-1">
              Konten dijadwalkan pada <strong>{form.post_date}</strong> pukul <strong>{form.post_time}</strong>
            </p>
            <p className="text-stone-500 text-xs mb-6">
              Kamu akan dapat notifikasi {REMINDER_OPTIONS.find(r => r.value === form.reminder_hours_before)?.label || "sebelum posting"}
            </p>
            <div className="flex flex-col gap-2 text-xs text-stone-400 mb-6 bg-stone-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <TelegramLogo size={14} className="text-[#2AABEE]" weight="fill" />
                Notif via Telegram — aktifkan di Settings
              </div>
              <div className="flex items-center gap-2">
                <WhatsappLogo size={14} className="text-[#25D366]" weight="fill" />
                Notif via WhatsApp — aktifkan di Settings
              </div>
            </div>
            <button onClick={reset} className="w-full py-3 bg-brand text-white rounded-full font-semibold">Selesai</button>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Judul Konten *</label>
              <input
                type="text"
                className="input"
                value={form.title}
                onChange={e => upd("title", e.target.value)}
                placeholder="mis. Promo Weekend Skincare"
                data-testid="schedule-title"
              />
            </div>

            {/* Caption */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Caption (opsional)</label>
              <textarea
                rows={3}
                className="input resize-none text-sm"
                value={form.caption}
                onChange={e => upd("caption", e.target.value)}
                placeholder="Caption siap copy-paste saat posting..."
                data-testid="schedule-caption"
              />
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 block">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => upd("platform", p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border btn-touch transition-all ${
                      form.platform === p.id ? "bg-brand text-white border-brand" : "bg-white border-stone-200 text-stone-600 hover:border-brand-light"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 flex items-center gap-1">
                  <CalendarBlank size={12} /> Tanggal Posting *
                </label>
                <input
                  type="date"
                  className="input"
                  value={form.post_date}
                  min={todayStr()}
                  onChange={e => upd("post_date", e.target.value)}
                  data-testid="schedule-date"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 flex items-center gap-1">
                  <Clock size={12} /> Jam Posting
                </label>
                <input
                  type="time"
                  className="input"
                  value={form.post_time}
                  onChange={e => upd("post_time", e.target.value)}
                  data-testid="schedule-time"
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 mb-1.5 flex items-center gap-1">
                <Bell size={12} /> Ingatkan Saya
              </label>
              <select
                className="input"
                value={form.reminder_hours_before}
                onChange={e => upd("reminder_hours_before", parseInt(e.target.value))}
                data-testid="schedule-reminder"
              >
                {REMINDER_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-stone-400 mt-1">
                Notifikasi dikirim via Telegram/WhatsApp sesuai setting di halaman Settings
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={reset} className="flex-1 py-3 border border-stone-200 text-stone-600 rounded-full font-semibold text-sm hover:bg-stone-50">
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                data-testid="schedule-save-btn"
                className="flex-1 py-3 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand-light inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <><CircleNotch size={16} className="animate-spin" /> Menyimpan...</> : <><CalendarBlank size={16} weight="fill" /> Jadwalkan</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
