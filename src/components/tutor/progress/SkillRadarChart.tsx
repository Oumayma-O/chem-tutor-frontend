import { SkillMastery } from "@/types/cognitive";
import { cn } from "@/lib/utils";
import { TEACHER_SCORE_MODERATE_MIN, TEACHER_SCORE_STRONG_MIN } from "@/lib/teacherScoreStyles";

interface SkillRadarChartProps {
  skills: SkillMastery[];
  size?: number;
}

const SKILL_LABELS: Record<string, string> = {
  reaction_concepts: "Concepts",
  rate_laws: "Rate Laws",
  variable_isolation: "Setup",
  unit_conversion: "Units",
  graph_interpretation: "Graphs",
};

export function SkillRadarChart({ skills, size = 200 }: SkillRadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const angleStep = (2 * Math.PI) / skills.length;
  const points = skills.map((skill, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (skill.score / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), skill };
  });
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const circleData = [{ ratio: 0.25, label: "25%" }, { ratio: 0.5, label: "50%" }, { ratio: 0.75, label: "75%" }, { ratio: 1, label: "100%" }];
  const axes = skills.map((skill, index) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      skill,
      endX: center + radius * Math.cos(angle),
      endY: center + radius * Math.sin(angle),
      labelX: center + (radius + 25) * Math.cos(angle),
      labelY: center + (radius + 25) * Math.sin(angle),
    };
  });
  const getStatusColor = (status: SkillMastery["status"]) => status === "mastered" ? "text-success" : status === "at_risk" ? "text-destructive" : "text-yellow-600 dark:text-yellow-400";
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground">Skill Mastery Map</h4>
        <div className="text-xs text-muted-foreground">Hover for details</div>
      </div>
      <svg width={size} height={size} className="mx-auto">
        {circleData.map((circle, i) => (
          <g key={i}>
            <circle cx={center} cy={center} r={circle.ratio * radius} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeDasharray={i < 3 ? "4 4" : "0"} className="text-muted-foreground" />
            <text x={center + circle.ratio * radius + 4} y={center} className="text-[8px] fill-muted-foreground" dominantBaseline="middle">{circle.label}</text>
          </g>
        ))}
        {axes.map((axis, i) => <line key={i} x1={center} y1={center} x2={axis.endX} y2={axis.endY} stroke="currentColor" strokeOpacity={0.2} className="text-muted-foreground" />)}
        <polygon points={polygonPoints} fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
        {points.map((point, i) => (
          <g key={i}>
            <circle cx={point.x} cy={point.y} r={6} fill={point.skill.status === "mastered" ? "hsl(var(--success))" : point.skill.status === "at_risk" ? "hsl(var(--destructive))" : "hsl(45, 93%, 47%)"} stroke="white" strokeWidth={2} />
            <text x={point.x} y={point.y - 12} textAnchor="middle" className="text-[9px] font-bold fill-foreground">{point.skill.score}%</text>
          </g>
        ))}
        {axes.map((axis, i) => (
          <text key={i} x={axis.labelX} y={axis.labelY} textAnchor="middle" dominantBaseline="middle" className={cn("text-[10px] font-medium fill-current", getStatusColor(axis.skill.status))}>
            <title>{axis.skill.description ?? axis.skill.skillName}</title>
            {SKILL_LABELS[axis.skill.skillId] || axis.skill.skillName.split(" ")[0]}
          </text>
        ))}
      </svg>
      <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-success" /><span className="text-xs text-muted-foreground">Strong ({TEACHER_SCORE_STRONG_MIN}%+)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} /><span className="text-xs text-muted-foreground">Developing ({TEACHER_SCORE_MODERATE_MIN}-{TEACHER_SCORE_STRONG_MIN - 1}%)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-destructive" /><span className="text-xs text-muted-foreground">Needs Support (&lt;{TEACHER_SCORE_MODERATE_MIN}%)</span></div>
      </div>
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        {skills.map((skill) => (
          <div key={skill.skillId} className="flex items-center justify-between gap-4 text-xs">
            <div className="min-w-0">
              <span className="text-foreground font-medium">{skill.skillName}</span>
              {skill.description && (
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{skill.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", skill.status === "mastered" && "bg-success", skill.status === "developing" && "bg-yellow-500", skill.status === "at_risk" && "bg-destructive")} style={{ width: `${skill.score}%` }} />
              </div>
              <span className="font-medium text-foreground w-8 text-right">{skill.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

