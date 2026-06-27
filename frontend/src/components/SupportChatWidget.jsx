import { useState, useEffect, useRef } from "react";
import { Sparkle, ArrowRight } from "@phosphor-icons/react";

const QUICK_QUESTIONS = [
  "Berapa harga per foto?",
  "Hasilnya bisa dipakai di mana saja?",
  "Bagaimana cara mulai?",
  "Kredit expired gak?",
  "Ada diskon gak?",
];

export default function SupportChatWidget({ title = "Ada pertanyaan?", subtitle = "Tanya langsung — Ara siap bantu." }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Halo! Ada yang mau kamu tanyakan tentang Feedify? Tanya apa saja — saya siap bantu. 👋" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/chat/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId, history: messages.slice(-6) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Koneksi bermasalah. Coba lagi ya 🙏" }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {(title || subtitle) && (
        <div className="text-center mb-6">
          {title && <h3 className="font-heading font-bold text-brand tracking-tight text-2xl lg:text-3xl">{title}</h3>}
          {subtitle && <p className="text-stone-500 text-sm mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="rounded-3xl overflow-hidden shadow-xl shadow-brand/8 border border-brand-sand bg-white">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-4 bg-brand">
          <div className="h-9 w-9 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center flex-shrink-0">
            <Sparkle size={16} weight="fill" className="text-brand-gold" />
          </div>
          <div>
            <div className="font-heading font-bold text-white text-sm">Ara · Asisten Feedify</div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-brand-cream/60 text-[10px]">Online sekarang</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatBoxRef} className="h-64 overflow-y-auto px-5 py-4 space-y-3" style={{ background: "#fafaf9" }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkle size={12} weight="fill" className="text-brand-gold" />
                </div>
              )}
              <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand text-brand-cream rounded-tr-sm"
                  : "bg-white text-stone-700 border border-stone-100 rounded-tl-sm shadow-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="h-7 w-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                <Sparkle size={12} weight="fill" className="text-brand-gold" />
              </div>
              <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-stone-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 py-2.5 border-t border-stone-100 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => send(q)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-brand-sand bg-white text-brand hover:bg-brand hover:text-brand-cream hover:border-brand transition-all font-medium">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-stone-100 flex gap-2 items-end bg-white">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ketik pertanyaan kamu..."
            className="flex-1 resize-none text-sm text-stone-700 placeholder:text-stone-400 outline-none leading-relaxed py-2 px-1 max-h-24 bg-transparent"
            data-testid="support-chat-input"
          />
          <button onClick={() => send()}
            disabled={!input.trim() || loading}
            className="h-9 w-9 rounded-full bg-brand text-brand-cream flex items-center justify-center flex-shrink-0 hover:bg-brand-light transition-colors disabled:opacity-40"
            data-testid="support-chat-send">
            <ArrowRight size={15} weight="bold" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-stone-400 mt-3">
        Ara · Asisten Feedify — siap bantu 24/7 · Pertanyaan lain?{" "}
        <a href="https://instagram.com/feedify.id" target="_blank" rel="noreferrer" className="text-brand-light hover:text-brand">DM @feedify.id</a>
      </p>
    </div>
  );
}
