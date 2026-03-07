import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import {
  FlaskConical,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  BookOpen,
  Target,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";

// ── Data ────────────────────────────────────────────────────

const STATS = [
  { value: "2,400+", label: "Students enrolled" },
  { value: "40+",    label: "Units & lessons" },
  { value: "3",      label: "Skill levels per topic" },
  { value: "AP",     label: "College-board aligned" },
];

const FEATURES = [
  {
    icon: FlaskConical,
    title: "Interactive Simulations",
    description: "Adjust parameters and watch reactions change in real-time. See the invisible.",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description: "Problems that scale with your skill. Guided scaffolding that fades as you grow.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Mastery scores, skill breakdowns, and personalized next-steps after every session.",
  },
  {
    icon: Users,
    title: "Classroom Mode",
    description: "Teachers assign units, track class progress, and view real-time analytics.",
  },
];

const TESTIMONIALS = [
  {
    quote: "The Bohr model simulation finally made electron shells click for me. I went from failing to a B+ in one month.",
    name: "Aisha K.",
    role: "10th Grade — Standard Chemistry",
    initials: "AK",
    color: "bg-blue-100 text-blue-700",
  },
  {
    quote: "I used Catalyst for AP prep and scored a 5. The step-by-step problems are exactly how the AP exam thinks.",
    name: "Marcus T.",
    role: "12th Grade — AP Chemistry",
    initials: "MT",
    color: "bg-violet-100 text-violet-700",
  },
  {
    quote: "Finally a tool that lets me customize the sequence to my class pace. The analytics save me hours of prep.",
    name: "Ms. Rivera",
    role: "Chemistry Teacher, 8 years",
    initials: "MR",
    color: "bg-emerald-100 text-emerald-700",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Watch the Simulation",
    desc: "Explore an interactive model for each topic. Adjust parameters and observe real-time changes.",
  },
  {
    step: "2",
    title: "Practice Step-by-Step",
    desc: "Solve adaptive problems with guided scaffolding. Start with worked examples, then go independent.",
  },
  {
    step: "3",
    title: "Track Your Mastery",
    desc: "See your skills grow. Get personalized recommendations and identify gaps before the exam.",
  },
];

// ── Sim previews ─────────────────────────────────────────────
function BohrPreview() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
      <circle cx="100" cy="100" r="18" fill="#3b82f6" opacity="0.15" />
      <circle cx="100" cy="100" r="12" fill="#3b82f6" opacity="0.25" />
      <circle cx="100" cy="100" r="7"  fill="#3b82f6" />
      <text x="100" y="104" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">6p</text>
      <circle cx="100" cy="100" r="32" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4" />
      <circle cx="100" cy="68"  r="4" fill="#3b82f6" />
      <circle cx="100" cy="132" r="4" fill="#3b82f6" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.3" />
      <circle cx="100" cy="42"  r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="142" cy="100" r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="100" cy="158" r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="58"  cy="100" r="4" fill="#3b82f6" opacity="0.8" />
    </svg>
  );
}

function KineticsPreview() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" aria-hidden>
      <line x1="22" y1="10" x2="22" y2="138" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="22" y1="138" x2="192" y2="138" stroke="#cbd5e1" strokeWidth="1" />
      <text x="14" y="26" fontSize="7" fill="#94a3b8" textAnchor="middle">E</text>
      {/* Reactant plateau */}
      <line x1="28" y1="108" x2="55" y2="108" stroke="#10b981" strokeWidth="2" />
      {/* Energy hump → product */}
      <path d="M 55 108 C 75 108 82 28 100 28 C 118 28 125 90 145 90 L 175 90"
        fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      {/* Activation energy dashed */}
      <line x1="100" y1="28" x2="100" y2="108" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2" />
      <text x="105" y="70" fontSize="7" fill="#3b82f6">Ea</text>
      {/* Labels */}
      <text x="30" y="102" fontSize="7" fill="#94a3b8">Reactants</text>
      <text x="148" y="84" fontSize="7" fill="#94a3b8">Products</text>
      {/* TS peak label */}
      <text x="88" y="22" fontSize="7" fill="#f59e0b">TS</text>
    </svg>
  );
}

function EquilibriumPreview() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" aria-hidden>
      <line x1="22" y1="10" x2="22" y2="138" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="22" y1="138" x2="192" y2="138" stroke="#cbd5e1" strokeWidth="1" />
      <text x="14" y="28" fontSize="7" fill="#94a3b8" textAnchor="middle">[C]</text>
      {/* Reactant: starts high, drops, levels */}
      <path d="M 30 32 C 55 32 72 94 105 100 C 130 104 158 105 185 105"
        fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      {/* Product: starts low, rises, levels */}
      <path d="M 30 130 C 55 130 72 72 105 65 C 130 60 158 59 185 59"
        fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      {/* Equilibrium vertical */}
      <line x1="105" y1="14" x2="105" y2="138" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" opacity="0.8" />
      <text x="108" y="22" fontSize="7" fill="#f59e0b">Eq.</text>
      {/* Legend */}
      <rect x="130" y="112" width="7" height="3" rx="1" fill="#3b82f6" />
      <text x="140" y="116" fontSize="6.5" fill="#3b82f6">[A]</text>
      <rect x="158" y="112" width="7" height="3" rx="1" fill="#10b981" />
      <text x="168" y="116" fontSize="6.5" fill="#10b981">[B]</text>
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BeakerMascot pose="idle" size={32} />
            <span className="text-lg font-bold text-foreground">Catalyst</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth?tab=signup")} className="gap-1.5">
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero (split layout) ──────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: value prop */}
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-5">
                Accelerate your mastery{" "}
                of <span className="text-primary">Chemistry.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Interactive simulations, adaptive step-by-step practice, and real-time mastery tracking.
                Built for Standard and AP Chemistry.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2 text-base px-8">
                  <Zap className="w-5 h-5" />
                  Start Learning Free
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="gap-2 text-base">
                  <BookOpen className="w-4 h-4" />
                  I Have an Account
                </Button>
              </div>

              {/* Social proof strip */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["bg-blue-400","bg-violet-400","bg-emerald-400","bg-amber-400"].map((c, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full border-2 border-card ${c}`} />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span>Loved by <strong className="text-foreground">2,400+ students</strong></span>
                </div>
              </div>
            </div>

            {/* Right: stacked sim frames + relaxed mascot */}
            <div className="flex justify-center lg:justify-end items-end gap-0">

              {/* Card stack */}
              <div className="relative shrink-0" style={{ width: 290, height: 390 }}>

                {/* Back card — Chemical Kinetics */}
                <div
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow overflow-hidden"
                  style={{ transform: "rotate(-8deg) translate(-32px, 18px)", zIndex: 1, opacity: 0.85 }}
                >
                  <div className="bg-muted/60 px-3 py-2 flex items-center gap-2 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400/70" />
                      <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                      <div className="w-2 h-2 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Chemical Kinetics</span>
                  </div>
                  <div className="px-4 py-2.5 border-b border-border">
                    <div className="text-[10px] text-muted-foreground">Kinetics › Rate Laws</div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mt-0.5">
                      <FlaskConical className="w-3 h-3 text-emerald-500" />
                      Reaction Energy — Simulation
                    </div>
                  </div>
                  <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-emerald-50/30 to-transparent" style={{ height: 220 }}>
                    <KineticsPreview />
                  </div>
                </div>

                {/* Mid card — Equilibrium */}
                <div
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow-md overflow-hidden"
                  style={{ transform: "rotate(7deg) translate(28px, 14px)", zIndex: 2, opacity: 0.9 }}
                >
                  <div className="bg-muted/60 px-3 py-2 flex items-center gap-2 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400/70" />
                      <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                      <div className="w-2 h-2 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Equilibrium</span>
                  </div>
                  <div className="px-4 py-2.5 border-b border-border">
                    <div className="text-[10px] text-muted-foreground">Equilibrium › Le Chatelier's</div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mt-0.5">
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                      Concentration vs Time
                    </div>
                  </div>
                  <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-amber-50/20 to-transparent" style={{ height: 220 }}>
                    <EquilibriumPreview />
                  </div>
                </div>

                {/* Front card — Bohr Model */}
                <div
                  className="absolute inset-0 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
                  style={{ zIndex: 3 }}
                >
                  <div className="bg-muted/60 px-3 py-2 flex items-center gap-2 border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400/70" />
                      <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                      <div className="w-2 h-2 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Bohr Model — Carbon (C)</span>
                  </div>
                  <div className="px-4 py-2.5 border-b border-border bg-card/80">
                    <div className="text-[10px] text-muted-foreground">Atomic Structure › Atomic Models</div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mt-0.5">
                      <FlaskConical className="w-3 h-3 text-primary" />
                      Atomic Models — Simulation
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-blue-50/40 to-transparent px-4 py-4 flex flex-col items-center" style={{ height: 210 }}>
                    <div className="w-32 h-32">
                      <BohrPreview />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">6 protons · 7 neutrons · 6 electrons</p>
                    <p className="text-[10px] text-muted-foreground">Config: 2-4</p>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Lesson progress</span>
                      <span>Level 2 / 3</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div className="h-full w-[55%] rounded-full bg-primary" />
                    </div>
                    <Button size="sm" className="w-full mt-3 gap-1.5 text-xs h-8">
                      <Zap className="w-3.5 h-3.5" />
                      Start Practice
                    </Button>
                  </div>
                </div>
              </div>

              {/* Relaxed mascot */}
              <div className="relative shrink-0 self-end" style={{ zIndex: 10, marginLeft: -8, marginBottom: -6 }}>
                <BeakerMascot mood="relaxed" size={115} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ───────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Chemistry is hard to visualize.
            <br />
            <span className="text-primary">We fix that.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Most students memorize formulas without understanding the underlying model.
            Catalyst makes the invisible visible — electrons move, concentrations shift,
            and atoms bond right in front of you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { icon: "🔬", label: "See it",     text: "Watch the simulation respond as you change variables." },
              { icon: "✏️", label: "Practice it", text: "Solve problems step-by-step with instant feedback." },
              { icon: "📈", label: "Own it",      text: "Track mastery across every skill and topic." },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-card p-5">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-foreground mb-1">{item.label}</div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A structured platform that takes you from confusion to mastery.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three steps to mastery, every lesson.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shrink-0">
                  {item.step}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Real students. Real results.
            </h2>
            <p className="text-muted-foreground text-sm">
              Don't take our word for it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Ready to ace your next exam?
          </h2>
          <p className="text-muted-foreground mb-4">
            Join thousands of students building real understanding — not just memorizing formulas.
          </p>
          <ul className="flex flex-col sm:flex-row justify-center gap-3 text-sm text-muted-foreground mb-8">
            {["Free to start", "No credit card needed", "AP + Standard Chemistry"].map((item) => (
              <li key={item} className="flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2 text-base px-8">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?tab=signup&join=true")} className="gap-2 text-base">
              <Users className="w-5 h-5" />
              Join with Teacher Code
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BeakerMascot pose="idle" size={20} />
            <span className="text-sm font-semibold text-foreground">Catalyst</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Accelerate your mastery of Chemistry. Built for students and teachers.
          </p>
        </div>
      </footer>
    </div>
  );
}
