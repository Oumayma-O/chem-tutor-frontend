import { Problem } from "@/types/chemistry";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import { formatMathContent } from "@/lib/mathDisplay";

interface WorkedExamplesPanelProps {
  examples: Problem[];
}

export function WorkedExamplesPanel({ examples }: WorkedExamplesPanelProps) {
  if (examples.length === 0) return null;
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Worked Examples Reference ({examples.length})</h4>
      </div>
      <Accordion type="single" collapsible className="space-y-1">
        {examples.map((ex, idx) => (
          <AccordionItem key={ex.id} value={ex.id} className="border-b-0">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              Example {idx + 1}: {ex.title}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-2">{ex.description}</p>
              <div className="space-y-2">
                {ex.steps.map((step) => (
                  <div key={step.id} className="bg-secondary/50 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{step.step_number}</span>
                      <span className="text-xs font-medium text-foreground">{step.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatMathContent(step.instruction)}</p>
                    {step.correct_answer && <p className="text-xs text-foreground mt-1 equation">{formatMathContent(step.correct_answer)}</p>}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

