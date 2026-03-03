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
  Sparkles 
} from "lucide-react";

const FEATURES = [
  {
    icon: FlaskConical,
    title: "Interactive Simulations",
    description: "Explore chemistry concepts with real-time visualizations. Adjust parameters and see how reactions change instantly.",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description: "Problems that adapt to your skill level. Start with guided examples, progress to independent problem-solving.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Monitor your mastery across topics with detailed skill breakdowns and cognitive insights.",
  },
  {
    icon: Users,
    title: "Classroom Mode",
    description: "Teachers create classes, assign chapters, and track student progress with real-time analytics.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Chemistry Tutoring
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Master Chemistry with{" "}
              <span className="text-primary">Guided Learning</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Interactive simulations, adaptive practice problems, and real-time progress tracking. 
              Built for students who want to truly understand chemistry, not just memorize it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2 text-base px-8">
                <Zap className="w-5 h-5" />
                Start Learning Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="gap-2 text-base px-8">
                <BookOpen className="w-5 h-5" />
                I Have an Account
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A structured learning platform that guides you from understanding to mastery.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all group"
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

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              How It Works
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-8">
            {[
              { step: "1", title: "Watch the Simulation", desc: "Explore an interactive simulation for each topic. Adjust parameters and see real-time changes." },
              { step: "2", title: "Practice Step-by-Step", desc: "Solve adaptive problems with guided scaffolding. Start with worked examples, then try on your own." },
              { step: "3", title: "Track Your Progress", desc: "See your mastery grow. Get personalized recommendations and identify areas to improve." },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to Master Chemistry?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of students building real understanding through guided practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2 text-base px-8">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?tab=signup&join=true")} className="gap-2 text-base px-8">
              <Users className="w-5 h-5" />
              Join with Teacher Code
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
