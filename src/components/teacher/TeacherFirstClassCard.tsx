import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeacherFirstClassCardProps {
  onOpenManageClasses: () => void;
}

export function TeacherFirstClassCard({ onOpenManageClasses }: TeacherFirstClassCardProps) {
  return (
    <Card className="mb-6 border-dashed border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Create your first class</CardTitle>
        <CardDescription>
          You&apos;re signed in as a teacher. Add a class to get a join code for students, then use the header
          dropdown to filter analytics and live data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" className="gap-2" onClick={onOpenManageClasses}>
          <Plus className="w-4 h-4" />
          Create your first class
        </Button>
      </CardContent>
    </Card>
  );
}
