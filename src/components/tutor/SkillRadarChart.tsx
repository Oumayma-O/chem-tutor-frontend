import { SkillMastery } from "@/types/cognitive";
import { cn } from "@/lib/utils";

interface SkillRadarChartProps {
  skills: SkillMastery[];
  size?: number;
}

// Simplified skill labels for display
const SKILL_LABELS: Record<string, string> = {
  "reaction_concepts": "Concepts",
  "rate_laws": "Rate Laws",
  "variable_isolation": "Setup",
  "unit_conversion": "Units",
  "graph_interpretation": "Graphs",
};

export function SkillRadarChart({ skills, size = 200 }: SkillRadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) - 40;
  const angleStep = (2 * Math.PI) / skills.length;

  // Generate polygon points for the skill values
  const points = skills.map((skill, index) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const r = (skill.score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, skill };
  });

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(" ");

  // Generate concentric circles for reference with labels
  const circleData = [
    { ratio: 0.25, label: "25%" },
    { ratio: 0.5, label: "50%" },
    { ratio: 0.75, label: "75%" },
    { ratio: 1, label: "100%" },
  ];

  // Generate axis lines and labels
  const axes = skills.map((skill, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const endX = center + radius * Math.cos(angle);
    const endY = center + radius * Math.sin(angle);
    const labelX = center + (radius + 25) * Math.cos(angle);
    const labelY = center + (radius + 25) * Math.sin(angle);
    return { skill, endX, endY, labelX, labelY, angle };
  });

  const getStatusColor = (status: SkillMastery["status"]) => {
    switch (status) {
      case "mastered": return "text-success";
      case "developing": return "text-yellow-600 dark:text-yellow-400";
      case "at_risk": return "text-destructive";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground">Skill Mastery Map</h4>
        <div className="text-xs text-muted-foreground">Hover for details</div>
      </div>
      
      <svg width={size} height={size} className="mx-auto">
        {/* Background circles with labels */}
        {circleData.map((circle, i) => (
          <g key={i}>
            <circle
              cx={center}
              cy={center}
              r={circle.ratio * radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray={i < 3 ? "4 4" : "0"}
              className="text-muted-foreground"
            />
            {/* Circle labels on the right side */}
            <text
              x={center + circle.ratio * radius + 4}
              y={center}
              className="text-[8px] fill-muted-foreground"
              dominantBaseline="middle"
            >
              {circle.label}
            </text>
          </g>
        ))}

        {/* Axis lines */}
        {axes.map((axis, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={axis.endX}
            y2={axis.endY}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-muted-foreground"
          />
        ))}

        {/* Skill polygon - filled area */}
        <polygon
          points={polygonPoints}
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />

        {/* Data points with score labels */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={
                point.skill.status === "mastered" 
                  ? "hsl(var(--success))" 
                  : point.skill.status === "at_risk"
                  ? "hsl(var(--destructive))"
                  : "hsl(45, 93%, 47%)"
              }
              stroke="white"
              strokeWidth={2}
            />
            {/* Score label near each point */}
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              className="text-[9px] font-bold fill-foreground"
            >
              {point.skill.score}%
            </text>
          </g>
        ))}

        {/* Skill Labels */}
        {axes.map((axis, i) => (
          <text
            key={i}
            x={axis.labelX}
            y={axis.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className={cn("text-[10px] font-medium fill-current", getStatusColor(axis.skill.status))}
          >
            {SKILL_LABELS[axis.skill.skillId] || axis.skill.skillName.split(" ")[0]}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Strong (75%+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
          <span className="text-xs text-muted-foreground">Developing (50-74%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Needs Support (&lt;50%)</span>
        </div>
      </div>

      {/* Skill List */}
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        {skills.map((skill) => (
          <div key={skill.skillId} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{skill.skillName}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full",
                    skill.status === "mastered" && "bg-success",
                    skill.status === "developing" && "bg-yellow-500",
                    skill.status === "at_risk" && "bg-destructive"
                  )}
                  style={{ width: `${skill.score}%` }}
                />
              </div>
              <span className="font-medium text-foreground w-8 text-right">{skill.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
