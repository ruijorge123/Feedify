import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkle, ArrowRight, Microphone,
  Lightning, X, UploadSimple,
  MagnifyingGlass, TrendUp,
  Fire, ChartLine, ArrowsClockwise, Camera,
} from "@phosphor-icons/react";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  "Buat feed skincare premium",
  "Buat carousel edukasi acne",
  "Buat foto kopi aesthetic",
  "Buat poster promo",
  "Buat foto marketplace",
  "Buat banner Shopee",
  "Buat konten Hari Kemerdekaan",
  "Buat foto parfum luxury",
];

const CONTENT_INSIGHTS = [
  { emoji:"📸", stat:"+60%", label:"Penjualan", desc:"dengan foto produk berkualitas tinggi",     grad:"linear-gradient(135deg,#B45309,#92400E)", accent:"#FCD34D" },
  { emoji:"🎠", stat:"3×",   label:"Engagement", desc:"Carousel vs single-image post",            grad:"linear-gradient(135deg,#065F46,#064E3B)", accent:"#6EE7B7" },
  { emoji:"🎨", stat:"+80%", label:"Brand Recall", desc:"warna brand yang konsisten",             grad:"linear-gradient(135deg,#4C1D95,#3B0764)", accent:"#C4B5FD" },
  { emoji:"📱", stat:"91%",  label:"User Mobile", desc:"browsing produk via smartphone",          grad:"linear-gradient(135deg,#0E7490,#164E63)", accent:"#67E8F9" },
  { emoji:"⚡", stat:"10s",  label:"First Look", desc:"waktu keputusan visual calon pembeli",     grad:"linear-gradient(135deg,#9F1239,#881337)", accent:"#FCA5A5" },
];


const FLOAT_MENUS = [
  { label:"Feed & Banner", to:"/generate/banner",       emoji:"📸" },
  { label:"Carousel",      to:"/generate/carousel",     emoji:"🎠" },
  { label:"Marketplace",   to:"/generate/marketplace",  emoji:"🛒" },
  { label:"Foto Produk",   to:"/studio",                emoji:"🎨" },
  { label:"Packaging",     to:"/studio",                emoji:"📦" },
  { label:"Poster",        to:"/generate/banner",       emoji:"🖼️" },
  { label:"Story",         to:"/generate/carousel",     emoji:"📱" },
  { label:"Reels",         to:"/generate/reels",        emoji:"🎬" },
];


const PROMPT_ROUTES = [
  { kw:["video","reels","iklan video","motion"],                    route:"/generate/reels" },
  { kw:["carousel","slide","story","edukasi","storytelling"],       route:"/generate/carousel" },
  { kw:["marketplace","shopee","tokopedia","listing","lapak"],      route:"/generate/marketplace" },
  { kw:["caption","copy","teks","tulisan","kata"],                  route:"/generate/copywriting" },
  { kw:["studio","foto produk","product photo","kamera","premium"], route:"/studio" },
];

// ── Animation variants ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity:0, y:24 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.25,0.46,0.45,0.94] } },
};

const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.07 } },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function routeFromPrompt(text) {
  const lower = text.toLowerCase();
  for (const { kw, route } of PROMPT_ROUTES) {
    if (kw.some(k => lower.includes(k))) return route;
  }
  return "/generate/banner";
}


function useCountUp(target, duration=1400, delay=0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf, t0=null;
    const run = (ts) => {
      if (!t0) t0=ts;
      const el = ts-t0-delay;
      if (el<0) { raf=requestAnimationFrame(run); return; }
      const p = Math.min(el/duration,1);
      setVal(Math.round((1-Math.pow(1-p,3))*target));
      if (p<1) raf=requestAnimationFrame(run);
    };
    raf=requestAnimationFrame(run);
    return ()=>cancelAnimationFrame(raf);
  }, [target,duration,delay]);
  return val;
}

// ── Section 1: Prompt Hero ─────────────────────────────────────────────────────

function PromptHero({ brandName }) {
  const navigate = useNavigate();
  const [prompt,    setPrompt]    = useState("");
  const [phIdx,     setPhIdx]     = useState(0);
  const [phVisible, setPhVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx(i => (i+1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const go = () => navigate(routeFromPrompt(prompt || PLACEHOLDERS[phIdx]));

  const h = new Date().getHours();
  const greet = h<11 ? "Selamat pagi" : h<14 ? "Selamat siang" : h<18 ? "Selamat sore" : "Selamat malam";

  return (
    <motion.div
      initial="hidden" animate="visible" variants={fadeUp}
      className="relative overflow-hidden rounded-3xl"
      style={{ background:"#040F09" }}>

      {/* ── Moving green blobs ── */}
      <motion.div
        animate={{ x:[0, 260, -80, 0], y:[0, -100, 60, 0] }}
        transition={{ duration:8, repeat:Infinity, ease:"easeInOut" }}
        className="absolute w-96 h-96 rounded-full blur-[80px] pointer-events-none"
        style={{ background:"#00C060", opacity:0.45, top:"-25%", left:"-8%" }} />
      <motion.div
        animate={{ x:[0, -200, 100, 0], y:[0, 100, -80, 0] }}
        transition={{ duration:10, repeat:Infinity, ease:"easeInOut", delay:1.5 }}
        className="absolute w-[430px] h-[430px] rounded-full blur-[100px] pointer-events-none"
        style={{ background:"#16A34A", opacity:0.40, top:"-15%", right:"-12%" }} />
      <motion.div
        animate={{ x:[0, 150, -120, 0], y:[0, -150, 80, 0] }}
        transition={{ duration:12, repeat:Infinity, ease:"easeInOut", delay:0.8 }}
        className="absolute w-80 h-80 rounded-full blur-[90px] pointer-events-none"
        style={{ background:"#059669", opacity:0.38, bottom:"-20%", left:"10%" }} />
      <motion.div
        animate={{ x:[0, -120, 80, 0], y:[0, 80, -60, 0], scale:[1,1.2,0.9,1] }}
        transition={{ duration:14, repeat:Infinity, ease:"easeInOut", delay:0.3 }}
        className="absolute w-[560px] h-[560px] rounded-full blur-[130px] pointer-events-none"
        style={{ background:"#065F46", opacity:0.55, top:"10%", left:"20%" }} />
      <motion.div
        animate={{ x:[0, -100, 60, 0], y:[0, 70, -40, 0] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:3 }}
        className="absolute w-60 h-60 rounded-full blur-[70px] pointer-events-none"
        style={{ background:"#E5C158", opacity:0.12, top:"-5%", right:"8%" }} />

      <div className="relative z-10 px-6 py-10 lg:px-12 lg:py-14">
        <p className="text-sm font-medium mb-1" style={{ color:"rgba(229,193,88,0.7)" }}>
          {greet} 👋
        </p>
        <h1 className="font-heading font-black text-white tracking-tight leading-none mb-3"
          style={{ fontSize:"clamp(1.8rem,4vw,3rem)" }}>
          {brandName}
        </h1>
        <h2 className="font-heading font-bold text-white/90 leading-tight mb-2"
          style={{ fontSize:"clamp(1.05rem,2.5vw,1.45rem)" }}>
          Apa yang ingin kamu buat hari ini?
        </h2>
        <p className="text-white/40 text-sm max-w-lg mb-8">
          Jelaskan ide apa pun. Feedify akan memilih AI terbaik untuk membuatnya.
        </p>

        {/* Prompt bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key==="Enter" && go()}
              className="w-full rounded-2xl px-5 py-4 text-white text-base focus:outline-none transition-all"
              style={{
                background:"rgba(255,255,255,0.08)",
                border:"1px solid rgba(255,255,255,0.15)",
                backdropFilter:"blur(12px)",
              }}
              data-testid="prompt-input"
            />
            {/* Animated placeholder (only when input is empty) */}
            {!prompt && (
              <div className="absolute inset-0 px-5 py-4 pointer-events-none flex items-center">
                <span
                  className="text-white/30 text-base transition-opacity duration-300"
                  style={{ opacity: phVisible ? 1 : 0 }}>
                  {PLACEHOLDERS[phIdx]}
                </span>
              </div>
            )}
            {prompt && (
              <button onClick={() => setPrompt("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          <motion.button
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            onClick={go}
            className="flex-shrink-0 px-6 py-4 rounded-2xl font-bold text-sm"
            style={{ background:"#E5C158", color:"#0B3D2E", boxShadow:"0 8px 24px rgba(229,193,88,0.28)" }}
            data-testid="prompt-generate-btn">
            <span className="hidden sm:inline">Generate ✨</span>
            <span className="sm:hidden"><Sparkle size={18} weight="fill" /></span>
          </motion.button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon:<UploadSimple size={13} weight="bold"/>, label:"📷 Upload Produk", action:()=>navigate("/studio") },
            { icon:<Sparkle     size={13} weight="fill"/>, label:"✨ AI Suggest",     action:go },
            { icon:<Microphone  size={13} weight="bold"/>, label:"🎤 Voice",           action:()=>toast.info("Segera hadir!") },
          ].map(({ icon, label, action }) => (
            <motion.button key={label} onClick={action}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors hover:text-white"
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)" }}>
              {icon} {label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Section 2: Content Insights ───────────────────────────────────────────────

function ContentInsights() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <p className="font-heading font-bold text-brand text-xl mb-4 tracking-tight">Tahukah Kamu?</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {CONTENT_INSIGHTS.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.08, duration: 0.45, ease:[0.25,0.46,0.45,0.94] }}
            className="relative flex-shrink-0 overflow-hidden rounded-2xl p-5 flex flex-col justify-between"
            style={{ background: ins.grad, width: 160, minHeight: 150, border:"1px solid rgba(255,255,255,0.08)" }}>

            {/* Decorative blob */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
              style={{ background: ins.accent, opacity: 0.25 }} />

            <div className="text-xl">{ins.emoji}</div>

            <div>
              <div className="font-heading font-black leading-none mb-0.5"
                style={{ fontSize:"2rem", color: ins.accent }}>
                {ins.stat}
              </div>
              <div className="text-white font-bold text-sm leading-tight">{ins.label}</div>
              <div className="text-white/50 text-[11px] mt-1 leading-snug">{ins.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Marquee row helper ─────────────────────────────────────────────────────────

const CHIPS_ROW1 = ["Ganti Background","Lighting","Camera Angle","Hero Shot","Flatlay","Luxury Ads","Unboxing","Packaging"];
const CHIPS_ROW2 = ["Remove Object","Seasonal Decor","Food Styling","Fashion","Cosmetic","Furniture","Color Grading","Shadow Effect"];

function MarqueeRow({ chips, reverse = false, speed = 28 }) {
  const doubled = [...chips, ...chips];
  return (
    <div className="overflow-hidden w-full">
      <motion.div
        animate={{ x: reverse ? ["0%", "50%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        className="flex gap-2 w-max">
        {doubled.map((c, i) => (
          <div key={i}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap"
            style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)" }}>
            <span style={{ color:"#E5C158", fontSize:9 }}>✦</span> {c}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Section 2: AI Visual Studio ────────────────────────────────────────────────

function AIVisualStudio() {
  const STUDIO_URL = "https://share.gemini.google/oappNqItDCrZ";

  return (
    <motion.div
      data-testid="dash-visual-studio"
      initial="hidden" animate="visible" variants={fadeUp}
      className="relative overflow-hidden rounded-3xl cursor-pointer"
      style={{ background:"#040F09" }}
      onClick={() => window.open(STUDIO_URL, "_blank")}
      whileHover={{ scale:1.006 }}
      transition={{ duration:0.35 }}>

      <motion.div
        animate={{ x:[0, 240, -70, 0], y:[0, -90, 50, 0] }}
        transition={{ duration:8, repeat:Infinity, ease:"easeInOut", delay:0.5 }}
        className="absolute w-96 h-96 rounded-full blur-[80px] pointer-events-none"
        style={{ background:"#00C060", opacity:0.38, top:"-25%", left:"-5%" }} />
      <motion.div
        animate={{ x:[0, -180, 90, 0], y:[0, 90, -70, 0] }}
        transition={{ duration:10, repeat:Infinity, ease:"easeInOut", delay:2 }}
        className="absolute w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none"
        style={{ background:"#16A34A", opacity:0.35, top:"-10%", right:"-10%" }} />
      <motion.div
        animate={{ x:[0, 130, -100, 0], y:[0, -130, 70, 0] }}
        transition={{ duration:12, repeat:Infinity, ease:"easeInOut", delay:1.2 }}
        className="absolute w-80 h-80 rounded-full blur-[90px] pointer-events-none"
        style={{ background:"#059669", opacity:0.32, bottom:"-20%", left:"15%" }} />
      <motion.div
        animate={{ x:[0, -100, 70, 0], y:[0, 70, -50, 0], scale:[1,1.2,0.9,1] }}
        transition={{ duration:14, repeat:Infinity, ease:"easeInOut", delay:0.8 }}
        className="absolute w-[540px] h-[540px] rounded-full blur-[130px] pointer-events-none"
        style={{ background:"#065F46", opacity:0.50, top:"10%", left:"22%" }} />
      <motion.div
        animate={{ x:[0, -90, 50, 0], y:[0, 60, -35, 0] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:3.5 }}
        className="absolute w-56 h-56 rounded-full blur-[70px] pointer-events-none"
        style={{ background:"#E5C158", opacity:0.10, top:"-5%", right:"10%" }} />

      {/* ∞ Unlimited badge */}
      <div className="absolute top-5 right-5 z-20">
        <motion.div
          animate={{ opacity:[0.5,1,0.5], scale:[1,1.08,1] }}
          transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
          className="absolute inset-0 rounded-full blur-[10px] pointer-events-none"
          style={{ background:"#E5C158", opacity:0.6 }} />
        <div className="relative flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background:"linear-gradient(135deg,rgba(229,193,88,0.25),rgba(245,166,35,0.15))",
            border:"1.5px solid rgba(229,193,88,0.85)",
            boxShadow:"0 0 18px rgba(229,193,88,0.9), 0 0 40px rgba(245,166,35,0.5), 0 0 70px rgba(229,193,88,0.25), inset 0 0 12px rgba(229,193,88,0.1)",
            backdropFilter:"blur(10px)",
          }}>
          <motion.span
            animate={{
              textShadow:["0 0 8px #E5C158","0 0 24px #F5A623, 0 0 48px #E5C158","0 0 8px #E5C158"],
              scale:[1,1.15,1],
            }}
            transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}
            className="font-heading font-black text-xl leading-none"
            style={{ color:"#FFE566" }}>
            ∞
          </motion.span>
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color:"#FFE566", textShadow:"0 0 12px rgba(229,193,88,0.8)" }}>
            Unlimited Generating
          </span>
        </div>
      </div>

      <div className="relative z-10 p-6 lg:p-8 pt-16 lg:pt-16">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
              style={{ background:"rgba(229,193,88,0.10)", border:"1px solid rgba(229,193,88,0.22)" }}>
              <Sparkle size={10} weight="fill" style={{ color:"#E5C158" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#E5C158" }}>AI Visual Studio</span>
            </div>

            <h2 className="font-heading font-black text-white leading-tight mb-3"
              style={{ fontSize:"clamp(1.5rem,3vw,2.4rem)", letterSpacing:"-0.02em" }}>
              Feedify AI<br />Visual Studio
            </h2>

            <p className="text-white/40 text-sm mb-6 max-w-xs">
              Semua tools AI dalam satu canvas — generate tanpa batas.
            </p>

            <div className="space-y-2 mb-7 overflow-hidden">
              <MarqueeRow chips={CHIPS_ROW1} reverse={false} speed={26} />
              <MarqueeRow chips={CHIPS_ROW2} reverse={true}  speed={30} />
            </div>

            <div className="relative inline-block" onClick={e => e.stopPropagation()}>
              <motion.button
                whileHover={{ scale:1.05, y:-2 }}
                whileTap={{ scale:0.96 }}
                onClick={() => window.open(STUDIO_URL, "_blank")}
                className="relative overflow-hidden inline-flex items-center gap-3 px-7 py-4 rounded-full font-bold text-base"
                style={{
                  background:"linear-gradient(90deg,#E5C158 0%,#F5A623 50%,#E5C158 100%)",
                  color:"#0B2D1E",
                  boxShadow:"0 0 32px rgba(229,193,88,0.5), 0 4px 20px rgba(229,193,88,0.3)",
                }}>
                <motion.div
                  animate={{ x:["-100%","200%"] }}
                  transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut", repeatDelay:1.5 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", width:"50%" }} />
                <span>Open Visual Studio</span>
                <motion.span animate={{ x:[0,5,0] }} transition={{ duration:1.2, repeat:Infinity, ease:"easeInOut" }}>
                  <ArrowRight size={18} weight="bold" />
                </motion.span>
              </motion.button>
            </div>
          </div>

          {/* Right column: feature cards — horizontal scroll strip on mobile, vertical column on desktop */}
          <div className="flex flex-row lg:flex-col gap-3 flex-shrink-0 w-full lg:w-56 pt-2 overflow-x-auto lg:overflow-visible no-scrollbar">

            <motion.div
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:0.15, duration:0.5 }}
              whileHover={{ y:-3, scale:1.02 }}
              className="rounded-2xl overflow-hidden w-56 flex-shrink-0"
              style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.04)" }}>
              <div className="h-24 relative flex">
                <div className="w-1/2 h-full flex items-center justify-center"
                  style={{ background:"rgba(245,240,230,0.06)", borderRight:"1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-3 rounded-full" style={{ background:"rgba(200,190,160,0.25)" }}/>
                    <div className="w-8 h-6 rounded-lg" style={{ background:"rgba(180,170,140,0.20)" }}/>
                  </div>
                </div>
                <div className="w-1/2 h-full flex items-center justify-center"
                  style={{ background:"linear-gradient(135deg,#0B3D2E55,#1A6B5066,#2D8A6A33)" }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-3 rounded-full" style={{ background:"rgba(229,193,88,0.45)" }}/>
                    <div className="w-8 h-6 rounded-lg" style={{ background:"rgba(229,193,88,0.30)" }}/>
                  </div>
                </div>
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px" style={{ background:"rgba(255,255,255,0.35)" }}/>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                  <span style={{ fontSize:7, color:"#333", fontWeight:900 }}>⇔</span>
                </div>
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background:"rgba(0,0,0,0.5)", color:"rgba(255,255,255,0.7)" }}>ASLI</div>
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background:"rgba(229,193,88,0.3)", color:"#E5C158" }}>AI</div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-white/75 text-[11px] font-semibold">Editor Foto AI</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(52,211,153,0.18)", color:"#34D399" }}>Ganti Latar</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:0.25, duration:0.5 }}
              whileHover={{ y:-3, scale:1.02 }}
              className="rounded-2xl overflow-hidden w-56 flex-shrink-0"
              style={{ border:"1px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.04)" }}>
              <div className="h-20 relative flex items-center justify-center"
                style={{
                  backgroundImage:"linear-gradient(45deg,rgba(90,90,90,0.35) 25%,transparent 25%,transparent 75%,rgba(90,90,90,0.35) 75%),linear-gradient(45deg,rgba(90,90,90,0.35) 25%,transparent 25%,transparent 75%,rgba(90,90,90,0.35) 75%)",
                  backgroundSize:"10px 10px",
                  backgroundPosition:"0 0,5px 5px",
                  backgroundColor:"rgba(20,20,20,0.8)",
                }}>
                <div className="flex flex-col items-center gap-0.5 opacity-80">
                  <div className="w-10 h-3 rounded-full" style={{ background:"rgba(229,193,88,0.5)", boxShadow:"0 0 8px rgba(229,193,88,0.3)" }}/>
                  <div className="w-9 h-7 rounded-lg" style={{ background:"rgba(229,193,88,0.35)", boxShadow:"0 0 8px rgba(229,193,88,0.2)" }}/>
                </div>
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background:"rgba(167,139,250,0.3)", color:"#A78BFA" }}>PNG</div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-white/75 text-[11px] font-semibold">Hapus Background</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(167,139,250,0.18)", color:"#A78BFA" }}>Transparan</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:0.35, duration:0.5 }}
              whileHover={{ y:-3, scale:1.02 }}
              className="rounded-2xl overflow-hidden w-56 flex-shrink-0"
              style={{ border:"1px solid rgba(255,255,255,0.10)", background:"linear-gradient(135deg,rgba(18,16,26,0.9),rgba(26,16,40,0.9))" }}>
              <div className="h-20 relative flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background:"rgba(229,193,88,0.15)", border:"1px solid rgba(229,193,88,0.3)" }}>
                    <Camera size={16} style={{ color:"#E5C158", opacity:0.8 }}/>
                  </div>
                  <span style={{ fontSize:7, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>PRODUK</span>
                </div>
                <span style={{ color:"rgba(255,255,255,0.25)", fontSize:16, fontWeight:900, marginBottom:10 }}>+</span>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.3)" }}>
                    <span style={{ fontSize:16 }}>👤</span>
                  </div>
                  <span style={{ fontSize:7, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>MODEL</span>
                </div>
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  style={{ background:"rgba(229,193,88,0.2)", color:"#E5C158" }}>AI</div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-white/75 text-[11px] font-semibold">Pasang ke Model</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(229,193,88,0.18)", color:"#E5C158" }}>Komersial</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Section 3: Feedify Market Research ────────────────────────────────────────

const GENERATOR_ROUTE = {
  reels:       "/generate/reels",
  carousel:    "/generate/carousel",
  banner:      "/generate/banner",
  copywriting: "/generate/copywriting",
};
const GENERATOR_LABEL = {
  reels:       "🎬 Generate Reels",
  carousel:    "🎠 Generate Carousel",
  banner:      "📸 Generate Banner",
  copywriting: "✍️ Generate Caption",
};

function scoreLabel(score) {
  if (score >= 80) return { label: "Sangat Tinggi", color: "#4ADE80" };
  if (score >= 60) return { label: "Tinggi",        color: "#86EFAC" };
  if (score >= 40) return { label: "Moderat",       color: "#FDE68A" };
  if (score >= 20) return { label: "Rendah",        color: "#FCA5A5" };
  return                  { label: "Sangat Rendah", color: "#F87171" };
}

function MarketIntelligence() {
  const navigate = useNavigate();
  const [query,     setQuery]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [trending,  setTrending]  = useState(null);
  const [tLoading,  setTLoading]  = useState(true);
  const [error,     setError]     = useState("");
  const [usage,     setUsage]     = useState({ used: 0, limit: 3, remaining: 3 });

  useEffect(() => {
    api.get("/market-intelligence/trending")
      .then(r => setTrending(r.data.trending || []))
      .catch(() => setTrending([]))
      .finally(() => setTLoading(false));
    api.get("/market-intelligence/usage")
      .then(r => setUsage(r.data))
      .catch(() => {});
  }, []);

  const handleAnalyze = async (kw) => {
    const term = (kw || query).trim();
    if (!term) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const r = await api.get("/market-intelligence/opportunity", { params: { q: term } });
      setResult(r.data);
      // Refresh usage count after successful analysis
      api.get("/market-intelligence/usage").then(r => setUsage(r.data)).catch(() => {});
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const status = e?.response?.status;
      if (!e?.response) {
        setError("Backend tidak dapat dijangkau. Pastikan server sudah berjalan di port 8001.");
      } else if (status === 429 && detail?.includes("Batas riset")) {
        setError(detail);
        api.get("/market-intelligence/usage").then(r => setUsage(r.data)).catch(() => {});
      } else if (status === 429) {
        setError("Google Trends sedang membatasi request. Tunggu 2–5 menit lalu coba lagi.");
      } else if (status === 401 || status === 403) {
        setError("Sesi login habis. Silakan login ulang.");
      } else {
        setError(detail || `Error ${status || ""}: Gagal mengambil data. Coba lagi.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const opp = result ? scoreLabel(result.content_potential) : null;

  return (
    <motion.div data-testid="dash-market-research" initial="hidden" animate="visible" variants={fadeUp}>
      <div className="relative overflow-hidden rounded-3xl" style={{ background: "#040F09" }}>

        {/* Animated blobs */}
        <motion.div animate={{ x:[0,200,-60,0], y:[0,-80,50,0] }} transition={{ duration:9, repeat:Infinity, ease:"easeInOut" }}
          className="absolute w-96 h-96 rounded-full blur-[90px] pointer-events-none"
          style={{ background:"#00C060", opacity:0.30, top:"-20%", left:"-8%" }} />
        <motion.div animate={{ x:[0,-160,80,0], y:[0,80,-60,0] }} transition={{ duration:11, repeat:Infinity, ease:"easeInOut", delay:1.5 }}
          className="absolute w-[400px] h-[400px] rounded-full blur-[110px] pointer-events-none"
          style={{ background:"#16A34A", opacity:0.28, top:"-5%", right:"-12%" }} />
        <motion.div animate={{ x:[0,100,-80,0], y:[0,-100,60,0] }} transition={{ duration:13, repeat:Infinity, ease:"easeInOut", delay:0.8 }}
          className="absolute w-72 h-72 rounded-full blur-[80px] pointer-events-none"
          style={{ background:"#059669", opacity:0.25, bottom:"-10%", left:"20%" }} />
        <motion.div animate={{ x:[0,-80,50,0], y:[0,60,-40,0], scale:[1,1.15,0.9,1] }} transition={{ duration:15, repeat:Infinity, ease:"easeInOut", delay:0.4 }}
          className="absolute w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none"
          style={{ background:"#065F46", opacity:0.45, top:"15%", left:"25%" }} />

        <div className="relative z-10 p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
              style={{ background:"rgba(229,193,88,0.12)", border:"1px solid rgba(229,193,88,0.25)" }}>
              <ChartLine size={11} weight="duotone" style={{ color:"#E5C158" }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:"#E5C158" }}>
                Feedify Market Research
              </span>
            </div>
            <h2 className="font-heading font-black text-white leading-tight mb-2"
              style={{ fontSize:"clamp(1.4rem,2.5vw,2rem)", letterSpacing:"-0.02em" }}>
              Riset Pasar AI<br/>Sebelum Buat Konten
            </h2>
            <p className="text-white/40 text-sm mb-5 max-w-md">
              Cek potensi pasar keyword produkmu, lalu langsung generate konten yang relevan.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon:"📊", label:"Google Trends Real-time" },
                { icon:"🤖", label:"AI Market Report" },
                { icon:"🔍", label:"Keyword Research" },
                { icon:"⚡", label:"Generate Langsung" },
              ].map(p => (
                <div key={p.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.65)" }}>
                  <span>{p.icon}</span> {p.label}
                </div>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:"rgba(255,255,255,0.35)" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                placeholder="Cari produk atau niche... contoh: Body Lotion, Kopi Susu, Hijab"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm transition-all focus:outline-none"
                style={{
                  background:"rgba(255,255,255,0.07)",
                  border:"1px solid rgba(255,255,255,0.12)",
                  color:"rgba(255,255,255,0.9)",
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                onClick={() => handleAnalyze()}
                disabled={loading || !query.trim() || usage.remaining === 0}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:"linear-gradient(135deg,#E5C158,#F5A623)", color:"#0B2D1E", boxShadow:"0 4px 18px rgba(229,193,88,0.35)" }}>
                {loading
                  ? <motion.span animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}>
                      <ArrowsClockwise size={16} weight="bold" />
                    </motion.span>
                  : <Lightning size={16} weight="fill" />
                }
                Analisa
              </motion.button>
              <span className="text-[10px] font-bold tabular-nums"
                style={{ color: usage.remaining === 0 ? "#F87171" : "rgba(255,255,255,0.35)" }}>
                {usage.remaining}/{usage.limit} hari ini
              </span>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl text-sm flex items-center justify-between gap-3"
              style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#FCA5A5" }}>
              <span>{error}</span>
              <button onClick={() => handleAnalyze()}
                className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100">
                Coba Lagi
              </button>
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-3">
              {[120, 100, 80, 100].map((h, i) => (
                <motion.div key={i}
                  animate={{ opacity:[0.2,0.4,0.2] }}
                  transition={{ duration:1.5, repeat:Infinity, ease:"easeInOut", delay:i*0.1 }}
                  className="rounded-2xl"
                  style={{ height:h, background:"rgba(255,255,255,0.06)" }} />
              ))}
            </div>
          )}

          {/* AI Market Report */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                key="report"
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0 }} transition={{ duration:0.4 }}
                className="space-y-3">

                {/* Report header bar */}
                <div className="px-4 py-3 rounded-2xl flex items-center justify-between"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)" }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color:"rgba(255,255,255,0.35)" }}>AI Market Report</p>
                    <p className="font-heading font-black text-white text-base">"{result.keyword}"</p>
                  </div>
                  <p className="text-[11px] font-medium" style={{ color:"rgba(255,255,255,0.3)" }}>
                    {new Date().toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })}
                  </p>
                </div>

                {/* Peluang Pasar */}
                <div className="rounded-2xl p-5"
                  style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.10)" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color:"rgba(255,255,255,0.35)" }}>🟢 Peluang Pasar</p>
                      <div className="flex items-end gap-2">
                        <p className="font-heading font-black text-4xl leading-none" style={{ color: opp.color }}>
                          {result.content_potential}
                        </p>
                        <p className="text-base font-bold mb-0.5" style={{ color:"rgba(255,255,255,0.25)" }}>/100</p>
                        <p className="text-sm font-black mb-0.5" style={{ color: opp.color }}>{opp.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color:"rgba(255,255,255,0.35)" }}>AI Confidence</p>
                      <p className="font-heading font-black text-2xl" style={{ color:"#E5C158" }}>{result.confidence}%</p>
                    </div>
                  </div>

                  {result.risk_flags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {result.risk_flags.map((flag, i) => (
                        <span key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background:"rgba(251,191,36,0.12)", color:"#FCD34D", border:"1px solid rgba(251,191,36,0.25)" }}>
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {[
                      { label:"Demand",    value:result.demand_score,      color:"#4ADE80" },
                      { label:"Kompetisi", value:result.competition_score,  color:"#F87171" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] font-semibold" style={{ color:"rgba(255,255,255,0.5)" }}>{label}</span>
                          <span className="text-[11px] font-bold" style={{ color }}>{value}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                          <motion.div
                            initial={{ width:0 }} animate={{ width:`${value}%` }}
                            transition={{ duration:0.8, ease:"easeOut" }}
                            className="h-1.5 rounded-full" style={{ background:color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yang Sedang Dicari */}
                {result.related_keywords?.length > 0 && (
                  <div className="rounded-2xl p-5"
                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)" }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>
                      📈 Yang Sedang Dicari
                    </p>
                    <div className="space-y-2">
                      {result.related_keywords.slice(0, 5).map((kw, i) => (
                        <button key={i}
                          onClick={() => setQuery(kw)}
                          className="flex items-center gap-3 w-full text-left transition-opacity hover:opacity-70">
                          <span className="text-[11px] font-bold flex-shrink-0" style={{ color:"rgba(255,255,255,0.25)" }}>•</span>
                          <span className="text-sm font-medium" style={{ color:"rgba(255,255,255,0.8)" }}>{kw}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insight Feedify */}
                {result.ai_summary && (
                  <div className="rounded-2xl p-5"
                    style={{ background:"rgba(229,193,88,0.07)", border:"1px solid rgba(229,193,88,0.18)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkle size={14} weight="fill" style={{ color:"#E5C158" }} />
                      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color:"#E5C158" }}>💡 Insight Feedify</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color:"rgba(255,255,255,0.75)" }}>{result.ai_summary}</p>
                  </div>
                )}

                {/* Rekomendasi Konten */}
                <div className="rounded-2xl p-5"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)" }}>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>
                    🎯 Rekomendasi Konten
                  </p>
                  <div className="space-y-2 mb-4">
                    {(result.content_ideas || []).slice(0, 3).map((idea, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-black mt-0.5 flex-shrink-0" style={{ color:"#4ADE80" }}>✔</span>
                        <span className="text-sm" style={{ color:"rgba(255,255,255,0.7)" }}>{idea}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.recommended_generator && (
                      <motion.button
                        whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.96 }}
                        onClick={() => navigate(
                          GENERATOR_ROUTE[result.recommended_generator] || "/generate/banner",
                          { state: { prefillKeyword: result.keyword } }
                        )}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
                        style={{ background:"linear-gradient(135deg,#E5C158,#F5A623)", color:"#0B2D1E" }}>
                        <Lightning size={13} weight="fill" />
                        {GENERATOR_LABEL[result.recommended_generator]}
                      </motion.button>
                    )}
                    {Object.entries(GENERATOR_ROUTE)
                      .filter(([k]) => k !== result.recommended_generator)
                      .map(([k, to]) => (
                        <motion.button key={k}
                          whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.96 }}
                          onClick={() => navigate(to, { state: { prefillKeyword: result.keyword } })}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold"
                          style={{ background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", border:"1px solid rgba(255,255,255,0.12)" }}>
                          <Lightning size={11} weight="fill" />
                          {GENERATOR_LABEL[k]}
                        </motion.button>
                      ))
                    }
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trending Hari Ini */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Fire size={16} weight="fill" style={{ color:"#F87171" }} />
              <h3 className="font-heading font-bold text-white text-base">Trending di Indonesia Hari Ini</h3>
            </div>

            {tLoading && (
              <div className="grid gap-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div key={i}
                    animate={{ opacity:[0.15,0.3,0.15] }}
                    transition={{ duration:1.5, repeat:Infinity, ease:"easeInOut", delay:i*0.1 }}
                    className="h-14 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }} />
                ))}
              </div>
            )}

            {!tLoading && trending?.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color:"rgba(255,255,255,0.3)" }}>Data trending tidak tersedia saat ini.</p>
            )}

            {!tLoading && trending?.length > 0 && (
              <div className="grid gap-2">
                {trending.map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay:i*0.07 }}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}
                    whileHover={{ y:-2 }}>
                    <span className="font-heading font-black text-2xl w-6 text-center flex-shrink-0"
                      style={{ color:"rgba(255,255,255,0.12)" }}>
                      {i+1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color:"rgba(255,255,255,0.85)" }}>{item.keyword}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <TrendUp size={11} weight="bold" style={{ color:"#4ADE80" }} />
                        <span className="text-[11px] font-bold" style={{ color:"#4ADE80" }}>{item.traffic}</span>
                        <span className="text-[11px] ml-1" style={{ color:"rgba(255,255,255,0.3)" }}>pencarian</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                      onClick={() => { setQuery(item.keyword); handleAnalyze(item.keyword); }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold"
                      style={{ background:"linear-gradient(135deg,#E5C158,#F5A623)", color:"#0B2D1E" }}>
                      <Lightning size={11} weight="fill" />
                      Analisa
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Section 9: Floating AI ─────────────────────────────────────────────────────

function FloatingAI() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:10, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:10, scale:0.95 }}
            transition={{ duration:0.2, ease:[0.25,0.46,0.45,0.94] }}
            className="w-64 rounded-2xl bg-white shadow-2xl border border-stone-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-50">
              <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                Apa yang ingin kamu buat?
              </p>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
              {FLOAT_MENUS.map(({ label, to, emoji }) => (
                <button key={label} onClick={() => { navigate(to); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-stone-50 text-left transition-colors">
                  <span className="text-base">{emoji}</span>
                  <span className="text-xs font-medium text-stone-700">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-3 rounded-full text-white"
        style={{ background:"#0B3D2E", boxShadow:"0 8px 30px rgba(11,61,46,0.45)" }}
        data-testid="floating-ai-btn">
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate:-90,opacity:0 }} animate={{ rotate:0,opacity:1 }} exit={{ rotate:90,opacity:0 }} transition={{ duration:0.15 }}>
                <X size={16} weight="bold" />
              </motion.span>
            : <motion.span key="label" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex items-center gap-2">
                <Sparkle size={14} weight="fill" style={{ color:"#E5C158" }} />
                <span className="text-xs font-bold">✨ AI Assistant</span>
              </motion.span>
          }
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [brand,  setBrand] = useState(null);

  useEffect(() => {
    api.get("/brand-profile").then(r => setBrand(r.data)).catch(() => {});
  }, []);

  const brandName = brand?.brand_name || user?.name?.split(" ")[0] || "Brand Kamu";

  return (
    <div className="space-y-8 pb-28" data-testid="dashboard-page">
      <PromptHero brandName={brandName} />
      <AIVisualStudio />
      <MarketIntelligence />
      <ContentInsights />
      <FloatingAI />
    </div>
  );
}
