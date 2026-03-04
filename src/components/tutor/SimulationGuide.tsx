import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { BeakerMascot, MascotPose } from "./BeakerMascot";
import { supabase } from "@/integrations/supabase/client";
import { buildRagContext } from "@/data/ragContext";
import { apiGenerateGuide, useBackendApi } from "@/lib/api";

interface GuideStep {
  title: string;
  description: string;
  highlight: string;
  mascotPose: MascotPose;
}

const STATIC_GUIDE_STEPS: GuideStep[] = [
  { title: "Welcome to the Simulation!", description: "This interactive tool lets you explore how chemical reactions behave over time. Let me walk you through the key parts!", highlight: "", mascotPose: "encouraging" },
  { title: "The Beaker", description: "This beaker shows the reactant molecules. As the reaction progresses, molecules disappear — just like in a real experiment!", highlight: "sim-beaker", mascotPose: "pointing" },
  { title: "Concentration vs Time", description: "This chart shows how reactant concentration [A] decreases over time. The orange dot marks the half-life — when half the reactant remains.", highlight: "sim-graph", mascotPose: "explaining" },
  { title: "Adjust Parameters", description: "Use these sliders to change the initial concentration [A]₀ and rate constant k. Watch how the graph and half-life respond instantly!", highlight: "sim-controls", mascotPose: "pointing" },
  { title: "Key Equations", description: "These equations define the rate law, integrated rate law, and half-life formula for the selected reaction order.", highlight: "sim-equations", mascotPose: "thinking" },
];

const STORAGE_KEY = "chemtutor_sim_guide_seen";

interface SimulationGuideProps {
  unitId?: string;
  lessonName?: string;
  interests?: string[];
  gradeLevel?: string | null;
  masteryScore?: number;
}

export function SimulationGuide({ unitId, lessonName, interests, gradeLevel, masteryScore }: SimulationGuideProps) {
  const [hasSeen, setHasSeen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [step, setStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(hasSeen);
  const [personalizedSteps, setPersonalizedSteps] = useState<Record<number, { title: string; description: string }>>({});
  const fetchedRef = useRef<Set<number>>(new Set());

  const current = STATIC_GUIDE_STEPS[step];
  const personalized = personalizedSteps[step];
  const displayTitle = personalized?.title || current.title;
  const displayDescription = personalized?.description || current.description;
  const isLast = step === STATIC_GUIDE_STEPS.length - 1;

  // Fetch personalized guide text
  useEffect(() => {
    if (isMinimized || !unitId || fetchedRef.current.has(step)) return;
    if (!interests?.length && !gradeLevel) return;

    fetchedRef.current.add(step);

    const ragContext = buildRagContext(unitId, lessonName);

    const payload = { unitId, lessonName, guideStepIndex: step, interests: interests || [], gradeLevel, masteryScore, ragContext };
    (useBackendApi()
      ? apiGenerateGuide({
          chapter_id: unitId,
          topic_name: lessonName || "",
          guide_step_index: step,
          interests: interests || [],
          grade_level: gradeLevel,
          mastery_score: masteryScore,
          rag_context: ragContext,
        }).then((data) => ({ data }))
      : supabase.functions.invoke("generate-guide", { body: payload })
    ).then((res: { data?: { title?: string; description?: string } } | { title?: string; description?: string }) => {
      const data = "data" in res && res.data ? res.data : res;
      if (data?.title && data?.description) {
        setPersonalizedSteps((prev) => ({ ...prev, [step]: { title: data.title!, description: data.description! } }));
      }
    }).catch(() => {/* keep static */});
  }, [step, isMinimized, unitId, lessonName, interests, gradeLevel, masteryScore]);

  // Scroll highlighted element into view
  const scrollToHighlight = useCallback((highlightId: string) => {
    if (!highlightId) return;
    const target = document.querySelector(`[data-guide-id="${highlightId}"]`) as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.top < 80 || rect.bottom > viewportHeight - 200) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  // Highlight effect
  useEffect(() => {
    if (isMinimized || !current.highlight) {
      document.querySelectorAll("[data-guide-id]").forEach((el) => {
        (el as HTMLElement).style.removeProperty("box-shadow");
        (el as HTMLElement).style.removeProperty("border-radius");
      });
      return;
    }

    const target = document.querySelector(`[data-guide-id="${current.highlight}"]`) as HTMLElement | null;
    if (target) {
      target.style.boxShadow = "0 0 0 4px hsl(217 91% 40% / 0.3), 0 8px 32px rgba(0,0,0,0.1)";
      target.style.borderRadius = "12px";
    }

    document.querySelectorAll("[data-guide-id]").forEach((el) => {
      if ((el as HTMLElement).dataset.guideId !== current.highlight) {
        (el as HTMLElement).style.removeProperty("box-shadow");
      }
    });

    const scrollTimer = setTimeout(() => scrollToHighlight(current.highlight), 150);
    return () => {
      clearTimeout(scrollTimer);
      if (target) target.style.removeProperty("box-shadow");
    };
  }, [step, isMinimized, current.highlight, scrollToHighlight]);

  const handleFinish = () => {
    setIsMinimized(true);
    setStep(0);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setHasSeen(true);
  };

  const handleOpen = () => {
    setIsMinimized(false);
    setStep(0);
    fetchedRef.current.clear();
    setPersonalizedSteps({});
  };

  if (isMinimized) {
    return (
      <button onClick={handleOpen} className="fixed bottom-6 right-6 z-50 flex items-center gap-1 bg-card border border-primary/20 pl-1 pr-4 py-1 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group" aria-label="Open simulation guide">
        <BeakerMascot pose="idle" size={36} />
        <span className="text-sm font-medium text-foreground">Guide</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-card border border-primary/20 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="p-5 relative">
        <button onClick={handleFinish} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <BeakerMascot pose={current.mascotPose} size={56} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground mb-1">{displayTitle}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{displayDescription}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {STATIC_GUIDE_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "bg-primary w-5" : i < step ? "bg-primary/40 w-2" : "bg-border w-2"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1 h-7 px-2 text-xs">
                <ChevronLeft className="w-3 h-3" /> Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleFinish} className="h-7 px-4 text-xs">Got it!</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)} className="gap-1 h-7 px-4 text-xs">
                Next <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
