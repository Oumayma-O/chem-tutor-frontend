import { StudentCognitiveProfile } from "@/types/cognitive";
import { SkillRadarChart, LearningTimeline } from "@/components/tutor/progress";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Target,
  AlertTriangle,
  BookOpen,
  Award,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { TEACHING_STANDARDS, calculateGrowthTrend } from "@/lib/teacherAnalytics";

interface TeacherAnalyticsPanelProps {
  profile: StudentCognitiveProfile;
  standardsAlignment?: Record<string, number>;
}

export function TeacherAnalyticsPanel({ profile, standardsAlignment }: TeacherAnalyticsPanelProps) {
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [, setSelectedErrorType] = useState<string | null>(null);
  const growthTrend = calculateGrowthTrend(profile.recentAttempts);

  const errorDistribution = profile.errorPatterns.reduce((acc, pattern) => {
    acc[pattern.category] = pattern.count;
    return acc;
  }, {} as Record<string, number>);

  const totalErrors = Object.values(errorDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Teacher Analytics</h3>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            Live Data
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Filter className="w-3 h-3" />
              Standard
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Standard</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedStandard(null)}>
              All Standards
            </DropdownMenuItem>
            {TEACHING_STANDARDS.map((standard) => (
              <DropdownMenuItem
                key={standard.id}
                onClick={() => setSelectedStandard(standard.id)}
              >
                {standard.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <AlertTriangle className="w-3 h-3" />
              Error Type
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Error</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedErrorType(null)}>All Errors</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedErrorType("conceptual")}>Conceptual</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedErrorType("procedural")}>Procedural</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedErrorType("computational")}>Computational</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedErrorType("representation")}>Representation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Overall Mastery</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {Math.round(profile.masteryScore)}%
            </span>
            {renderTrendBadge(growthTrend)}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Growth Trend</span>
            {growthTrend.direction === "up" ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : growthTrend.direction === "down" ? (
              <TrendingDown className="w-4 h-4 text-destructive" />
            ) : (
              <Minus className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="text-sm font-medium text-foreground">
            {growthTrend.direction === "up" ? "Improving" : growthTrend.direction === "down" ? "Declining" : "Stable"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {growthTrend.percentage > 0 ? "+" : ""}
            {growthTrend.percentage.toFixed(1)}% over last 5 problems
          </div>
        </div>
      </div>

      <SkillRadarChart skills={profile.skillMap} size={200} />

      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Error Distribution
        </h4>
        {totalErrors === 0 ? (
          <p className="text-xs text-muted-foreground italic">No errors recorded yet</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(errorDistribution).map(([category, count]) => (
              <div key={category} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize text-foreground">{category}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        category === "conceptual" && "bg-purple-500",
                        category === "procedural" && "bg-blue-500",
                        category === "computational" && "bg-orange-500",
                        category === "representation" && "bg-pink-500",
                      )}
                      style={{ width: `${(count / totalErrors) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {profile.learningPatternSummary && (
        <div className="bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            Learning Pattern Insight
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            "{profile.learningPatternSummary}"
          </p>
        </div>
      )}

      <LearningTimeline attempts={profile.recentAttempts} />

      {profile.weakLessons.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Lessons Needing Attention
          </h4>
          <div className="flex flex-wrap gap-2">
            {profile.weakLessons.map((lesson) => (
              <Badge key={lesson} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                {lesson}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Standards Progress
        </h4>
        <div className="space-y-2">
          {TEACHING_STANDARDS.map((standard) => {
            // Use real data if provided; show 0 until backend wires per-standard mastery
            const progress = standardsAlignment?.[standard.id] ?? 0;
            return (
              <div
                key={standard.id}
                className={cn(
                  "p-2 rounded-md",
                  selectedStandard === standard.id && "bg-primary/10 ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">{standard.name}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      progress >= 80 ? "bg-success" : progress >= 50 ? "bg-yellow-500" : "bg-destructive",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{standard.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderTrendBadge(trend: { direction: "up" | "down" | "stable"; percentage: number }) {
  if (trend.direction === "up") {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
        <TrendingUp className="w-3 h-3 mr-1" />
        +{trend.percentage.toFixed(1)}%
      </Badge>
    );
  }
  if (trend.direction === "down") {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
        <TrendingDown className="w-3 h-3 mr-1" />
        {trend.percentage.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-secondary text-muted-foreground text-[10px]">
      <Minus className="w-3 h-3 mr-1" />
      Stable
    </Badge>
  );
}
