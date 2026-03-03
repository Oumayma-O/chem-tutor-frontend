import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, XCircle, ChevronDown, Users, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExitTicketAnalyticsPanelProps {
  classId: string;
}

interface QuestionData {
  id: string;
  question_order: number;
  question_text: string;
  correct_answer: string;
  unit?: string;
  format: string;
}

interface ResponseData {
  id: string;
  student_id: string;
  question_id: string;
  selected_answer: string | null;
  numeric_answer: string | null;
  is_correct: boolean | null;
  misconception_tag: string | null;
  time_spent_seconds: number | null;
}

interface StudentProfile {
  user_id: string;
  display_name: string;
}

interface TicketConfig {
  id: string;
  chapter_id: string;
  difficulty: string;
  question_count: number;
  created_at: string;
  is_active: boolean;
}

export function ExitTicketAnalyticsPanel({ classId }: ExitTicketAnalyticsPanelProps) {
  const [configs, setConfigs] = useState<TicketConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch configs for this class
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exit_ticket_configs")
        .select("id, chapter_id, difficulty, question_count, created_at, is_active")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });
      if (data) {
        setConfigs(data);
        if (data.length > 0) setSelectedConfigId(data[0].id);
      }
      setLoading(false);
    })();
  }, [classId]);

  // Fetch questions + responses + student names when config selected
  useEffect(() => {
    if (!selectedConfigId) return;
    (async () => {
      const [qRes, rRes] = await Promise.all([
        supabase.from("exit_ticket_questions").select("id, question_order, question_text, correct_answer, unit, format").eq("config_id", selectedConfigId).order("question_order"),
        supabase.from("exit_ticket_responses").select("id, student_id, question_id, selected_answer, numeric_answer, is_correct, misconception_tag, time_spent_seconds").eq("config_id", selectedConfigId),
      ]);
      if (qRes.data) setQuestions(qRes.data as any);
      if (rRes.data) {
        setResponses(rRes.data as any);
        // Fetch student names
        const studentIds = [...new Set((rRes.data as any[]).map(r => r.student_id))];
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", studentIds);
          if (profiles) {
            const map: Record<string, string> = {};
            profiles.forEach(p => { map[p.user_id] = p.display_name; });
            setStudents(map);
          }
        }
      }
    })();
  }, [selectedConfigId]);

  if (loading) return null;
  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No exit tickets have been created for this class yet.
        </CardContent>
      </Card>
    );
  }

  const uniqueStudentIds = [...new Set(responses.map(r => r.student_id))];

  // Per-question stats
  const questionStats = questions.map(q => {
    const qResponses = responses.filter(r => r.question_id === q.id);
    const correct = qResponses.filter(r => r.is_correct).length;
    const total = qResponses.length;
    const misconceptions = qResponses.filter(r => r.misconception_tag).map(r => r.misconception_tag!);
    return { ...q, correct, total, rate: total > 0 ? (correct / total) * 100 : 0, misconceptions };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Exit Ticket Analytics
        </CardTitle>
        <CardDescription>Review answer keys, student responses, and mastery per question</CardDescription>
        {configs.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {configs.map(c => (
              <Button key={c.id} variant={selectedConfigId === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedConfigId(c.id)} className="text-xs">
                {new Date(c.created_at).toLocaleDateString()} · {c.difficulty}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Answer Key */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Answer Key & Mastery</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Q#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Correct Answer</TableHead>
                <TableHead className="w-20">Mastery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionStats.map(q => (
                <TableRow key={q.id}>
                  <TableCell><Badge variant="outline">{q.question_order}</Badge></TableCell>
                  <TableCell className="text-sm">{q.question_text}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-foreground">{q.correct_answer}</span>
                    {q.unit && <span className="text-xs text-muted-foreground ml-1">({q.unit})</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.rate >= 80 ? "default" : q.rate >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {q.total > 0 ? `${Math.round(q.rate)}%` : "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Per-Student Responses */}
        {uniqueStudentIds.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Student Responses ({uniqueStudentIds.length})
            </h4>
            <Accordion type="single" collapsible className="space-y-1">
              {uniqueStudentIds.map(studentId => {
                const studentResponses = responses.filter(r => r.student_id === studentId);
                const correctCount = studentResponses.filter(r => r.is_correct).length;
                const totalQ = questions.length;
                const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

                return (
                  <AccordionItem key={studentId} value={studentId} className="border rounded-lg px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full mr-2">
                        <span className="text-sm font-medium">{students[studentId] || "Student"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{correctCount}/{totalQ}</span>
                          <Badge variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive"} className="text-xs">
                            {score}%
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Q#</TableHead>
                            <TableHead>Student Answer</TableHead>
                            <TableHead>Correct Answer</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {questions.map(q => {
                            const resp = studentResponses.find(r => r.question_id === q.id);
                            const studentAnswer = resp?.selected_answer || resp?.numeric_answer || "—";
                            return (
                              <TableRow key={q.id}>
                                <TableCell><Badge variant="outline" className="text-[10px]">{q.question_order}</Badge></TableCell>
                                <TableCell className={cn("text-sm font-mono", resp?.is_correct ? "text-success" : "text-destructive")}>
                                  {studentAnswer}
                                  {resp?.misconception_tag && (
                                    <span className="text-[10px] text-destructive ml-2">({resp.misconception_tag})</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                  {q.correct_answer} {q.unit && `(${q.unit})`}
                                </TableCell>
                                <TableCell>
                                  {resp?.is_correct ? (
                                    <CheckCircle className="w-4 h-4 text-success" />
                                  ) : resp ? (
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
