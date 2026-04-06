import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherSettingsTabProps {
  classes: TeacherClassRow[];
  onToggleCalculator: (classId: string, enabled: boolean) => void;
}

export function TeacherSettingsTab({ classes, onToggleCalculator }: TeacherSettingsTabProps) {
  return (
    <TabsContent value="settings" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculator Settings</CardTitle>
          <CardDescription>Toggle the built-in calculator on or off for each class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <span className="font-medium text-foreground text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({c.class_code})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{c.calculator_enabled ? "Enabled" : "Disabled"}</span>
                  <Switch
                    checked={c.calculator_enabled}
                    onCheckedChange={(checked) => onToggleCalculator(c.id, checked)}
                  />
                </div>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes found</p>}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
