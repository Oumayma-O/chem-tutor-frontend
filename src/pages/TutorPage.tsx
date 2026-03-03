import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useChapter } from "@/hooks/useChapter";
import { ChemistryTutor } from "@/components/tutor/ChemistryTutor";
import { CourseSidebar } from "@/components/tutor/CourseSidebar";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { useTopicCompletion } from "@/hooks/useTopicCompletion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";

export default function TutorPage() {
  const { chapterId, topicIndex } = useParams<{ chapterId: string; topicIndex?: string }>();
  const navigate = useNavigate();
  const { chapter, topicTitles, loading, error } = useChapter(chapterId);
  const currentTopicIdx = topicIndex ? parseInt(topicIndex, 10) : 0;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, user } = useAuth();
  const { markCompleted, markInProgress } = useTopicCompletion(chapterId || "", user?.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chapterId, topicIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !chapter || chapter.is_coming_soon || !chapter.is_active) {
    return <Navigate to="/" replace />;
  }

  const currentTopicName = topicTitles[currentTopicIdx] ?? "Practice";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20 min-h-[3.5rem] flex items-center px-4 justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <BeakerMascot pose="idle" size={24} className="shrink-0" />
          <div className="h-5 w-px bg-border shrink-0" />
          <h1 className="text-sm font-semibold text-foreground truncate py-1">
            {chapter.title} — {currentTopicName}
          </h1>
        </div>
        <NavDropdown />
      </header>

      <div className="flex">
        <CourseSidebar
          currentChapterId={chapter.id}
          currentTopicIndex={currentTopicIdx}
          open={sidebarOpen}
          chapterTitle={chapter.title}
          topicTitles={topicTitles}
          userId={user?.id}
        />
        <main className="flex-1 min-w-0 transition-all duration-300">
          <ChemistryTutor
            key={`${chapter.id}-${currentTopicIdx}`}
            chapterId={chapter.id}
            chapterTitle={chapter.title}
            topicName={currentTopicName}
            topicIndex={currentTopicIdx}
            userId={user?.id}
            onTopicComplete={() => markCompleted(currentTopicIdx)}
            onMarkInProgress={() => markInProgress(currentTopicIdx)}
            interests={profile?.interests || []}
            gradeLevel={profile?.grade_level}
          />
        </main>
      </div>
    </div>
  );
}
