import { Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

export function TeacherStandardsTab() {
  return (
    <TabsContent value="standards" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Standards alignment
          </CardTitle>
          <CardDescription>
            Per-standard progress for your classes will appear here when the backend exposes standards analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            There is no standards reporting endpoint wired yet. Check back after the API adds class- or
            student-level standards coverage.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
