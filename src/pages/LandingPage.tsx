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
    quote: "I used ChemTutor for AP prep and scored a 5. The step-by-step problems are exactly how the AP exam thinks.",
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

// ── Bohr model mini-preview ─────────────────────────────────
function BohrPreview() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
      {/* Nucleus */}
      <circle cx="100" cy="100" r="18" fill="#3b82f6" opacity="0.15" />
      <circle cx="100" cy="100" r="12" fill="#3b82f6" opacity="0.25" />
      <circle cx="100" cy="100" r="7"  fill="#3b82f6" />
      <text x="100" y="104" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">6p</text>

      {/* Shell 1 */}
      <circle cx="100" cy="100" r="32" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4" />
      <circle cx="100" cy="68"  r="4" fill="#3b82f6" />
      <circle cx="100" cy="132" r="4" fill="#3b82f6" />

      {/* Shell 2 */}
      <circle cx="100" cy="100" r="58" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.3" />
      <circle cx="100" cy="42"  r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="142" cy="100" r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="100" cy="158" r="4" fill="#3b82f6" opacity="0.8" />
      <circle cx="58"  cy="100" r="4" fill="#3b82f6" opacity="0.8" />
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
            <span className="text-lg font-bold text-foreground">Chem Tutor</span>
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Chemistry Tutoring
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-5">
                Make chemistry{" "}
                <span className="text-primary">click</span>
                {" "}— not just stick.
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

            {/* Right: app preview card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                {/* Fake browser chrome */}
                <div className="bg-muted/60 px-4 py-2.5 flex items-center gap-2 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                  </div>
                  <div className="flex-1 h-5 rounded-md bg-background/60 text-[10px] text-muted-foreground flex items-center px-2">
                    chemtutor.app
                  </div>
                </div>

                {/* Lesson header */}
                <div className="px-5 py-4 border-b border-border bg-card/80">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Atomic Structure › Atomic Models</div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    Atomic Models — Simulation
                  </div>
                </div>

                {/* Bohr model */}
                <div className="bg-gradient-to-b from-blue-50/40 to-transparent px-5 py-6 flex flex-col items-center">
                  <div className="w-36 h-36">
                    <BohrPreview />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    6 protons · 7 neutrons · 6 electrons
                  </p>
                  <p className="text-[11px] text-muted-foreground">Config: 2-4</p>
                </div>

                {/* Fake progress bar */}
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                    <span>Lesson progress</span>
                    <span>Level 2 / 3</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <div className="h-full w-[55%] rounded-full bg-primary" />
                  </div>
                  <Button size="sm" className="w-full mt-4 gap-1.5 text-xs">
                    <Zap className="w-3.5 h-3.5" />
                    Start Practice
                  </Button>
                </div>
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
            ChemTutor makes the invisible visible — electrons move, concentrations shift,
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
            <span className="text-sm font-semibold text-foreground">Chem Tutor</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-powered chemistry tutoring platform for students and teachers.
          </p>
        </div>
      </footer>
    </div>
  );
}
