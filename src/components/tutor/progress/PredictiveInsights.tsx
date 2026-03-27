import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Target, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillMastery, ProblemAttempt } from "@/types/cognitive";

interface ErrorPatternInput { category: string; count: number; recentSteps: string[]; }
interface PredictiveInsightsProps {
  masteryScore: number;
  skillMap: SkillMastery[];
  recentAttempts: ProblemAttempt[];
  errorPatterns: ErrorPatternInput[];
  studentName?: string;
}
interface Prediction {
  label: string; description: string; confidence: "high" | "medium" | "low";
  type: "success" | "warning" | "danger" | "info"; icon: React.ReactNode;
}
function generatePredictions(masteryScore: number, skillMap: SkillMastery[], recentAttempts: ProblemAttempt[], errorPatterns: ErrorPatternInput[]): Prediction[] {
  const predictions: Prediction[] = [];
  if (recentAttempts.length >= 3) {
    const recent3 = recentAttempts.slice(0, 3).map((a) => a.finalScore);
    const trend = recent3[0] - recent3[recent3.length - 1];
    if (trend > 10) predictions.push({ label: "Rapid Growth Detected", description: `Scores improving by ~${Math.round(trend)}% over last 3 problems. At this pace, mastery target reachable in ~${Math.max(1, Math.ceil((75 - masteryScore) / (trend / 3)))} more problems.`, confidence: "high", type: "success", icon: <TrendingUp className="w-4 h-4" /> });
    else if (trend < -10) predictions.push({ label: "Performance Dip", description: "Scores declining recently. May benefit from revisiting worked examples or reducing difficulty.", confidence: "medium", type: "danger", icon: <TrendingDown className="w-4 h-4" /> });
  }
  const weakSkills = skillMap.filter((s) => s.status === "at_risk");
  const strongSkills = skillMap.filter((s) => s.status === "mastered");
  if (weakSkills.length > 0) predictions.push({ label: "Skill Gap Alert", description: `Struggling with: ${weakSkills.map((s) => s.skillId.replace(/_/g, " ")).join(", ")}. Targeted practice on these areas could boost overall mastery by ~${Math.min(15, weakSkills.length * 5)}%.`, confidence: "high", type: "warning", icon: <AlertTriangle className="w-4 h-4" /> });
  if (strongSkills.length > 0 && weakSkills.length === 0) predictions.push({ label: "Ready for Challenge", description: "All skills at developing or mastered level. Student may benefit from harder problems to maintain engagement.", confidence: "medium", type: "success", icon: <Zap className="w-4 h-4" /> });
  const conceptualErrors = errorPatterns.filter((e) => e.category === "conceptual");
  const computationalErrors = errorPatterns.filter((e) => e.category === "computational");
  if (conceptualErrors.reduce((a, b) => a + b.count, 0) >= 3) predictions.push({ label: "Conceptual Reinforcement Needed", description: `${conceptualErrors.reduce((a, b) => a + b.count, 0)} conceptual errors detected. Recommend reviewing formula selection and reaction order before proceeding.`, confidence: "high", type: "warning", icon: <Lightbulb className="w-4 h-4" /> });
  if (computationalErrors.reduce((a, b) => a + b.count, 0) >= 2) predictions.push({ label: "Calculation Practice Suggested", description: "Recurring arithmetic or unit errors. A short drill on unit conversions could prevent future mistakes.", confidence: "medium", type: "info", icon: <Target className="w-4 h-4" /> });
  if (recentAttempts.length >= 2) {
    const avgTime = recentAttempts.reduce((a, b) => a + b.totalTimeSeconds, 0) / recentAttempts.length;
    if (avgTime > 300) predictions.push({ label: "Pacing Insight", description: `Average time per problem: ${Math.round(avgTime / 60)} minutes. This is above average and may indicate hesitation or confusion on key steps.`, confidence: "low", type: "info", icon: <Clock className="w-4 h-4" /> });
  }
  if (masteryScore < 75 && masteryScore >= 50) predictions.push({ label: "Level 3 Forecast", description: `Currently at ${masteryScore}%. Based on current trajectory, estimated ${Math.max(2, Math.ceil((75 - masteryScore) / 5))} more problems to reach Level 3 threshold.`, confidence: "medium", type: "info", icon: <Target className="w-4 h-4" /> });
  return predictions;
}
const TYPE_STYLES = { success: "border-success/30 bg-success/5", warning: "border-warning/30 bg-warning/5", danger: "border-destructive/30 bg-destructive/5", info: "border-primary/30 bg-primary/5" };
const ICON_STYLES = { success: "text-success", warning: "text-warning", danger: "text-destructive", info: "text-primary" };
const CONFIDENCE_BADGE = { high: { label: "High", variant: "default" as const }, medium: { label: "Med", variant: "secondary" as const }, low: { label: "Low", variant: "outline" as const } };
export function PredictiveInsights({ masteryScore, skillMap, recentAttempts, errorPatterns, studentName }: PredictiveInsightsProps) {
  const predictions = generatePredictions(masteryScore, skillMap, recentAttempts, errorPatterns);
  if (predictions.length === 0) {
    return <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />Predictive Insights</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground italic">Not enough data yet. Insights will appear after a few problem attempts.</p></CardContent></Card>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Predictive Insights
          {studentName && <span className="text-sm font-normal text-muted-foreground">— {studentName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictions.map((prediction, i) => (
          <div key={i} className={cn("p-3 rounded-lg border", TYPE_STYLES[prediction.type])}>
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5", ICON_STYLES[prediction.type])}>{prediction.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{prediction.label}</span>
                  <Badge variant={CONFIDENCE_BADGE[prediction.confidence].variant} className="text-[10px] px-1.5 py-0">{CONFIDENCE_BADGE[prediction.confidence].label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{prediction.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

