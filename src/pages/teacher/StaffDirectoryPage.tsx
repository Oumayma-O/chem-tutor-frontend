import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActivityHeartbeat } from "@/hooks/useActivityHeartbeat";
import {
  getSchoolAdminStats,
  getSuperadminStats,
  getSchoolAdmins,
  type AdminStats,
  type SuperadminStats,
} from "@/services/api/admin";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TeachersDirectoryTab from "@/components/teacher/TeachersDirectoryTab";
import AggregateAnalyticsTab from "@/components/teacher/AggregateAnalyticsTab";
import { US_DISTRICTS } from "@/lib/locationConfig";
import {
  Users2,
  GraduationCap,
  School,
  Building2,
  Shield,
  Users,
  SlidersHorizontal,
  X,
  List,
  BarChart2,
} from "lucide-react";

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  loading: boolean;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, icon: Icon, loading, iconBg, iconColor }: StatCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-slate-900">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffDirectoryPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  useActivityHeartbeat();

  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterSchool, setFilterSchool] = useState<string>("");

  const adminStatsQuery = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: getSchoolAdminStats,
    enabled: !isSuperAdmin,
    staleTime: 60_000,
  });

  const superadminStatsQuery = useQuery<SuperadminStats>({
    queryKey: ["superadmin-stats"],
    queryFn: getSuperadminStats,
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });

  // Load school admins to derive dynamic filter options
  const adminsQuery = useQuery({
    queryKey: ["school-admins"],
    queryFn: getSchoolAdmins,
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });

  const loading = isSuperAdmin ? superadminStatsQuery.isLoading : adminStatsQuery.isLoading;

  // Schools are free-text; derive unique values from loaded admin/teacher data
  const availableSchools = useMemo(() => {
    if (!filterDistrict) return [];
    const fromAdmins = (adminsQuery.data ?? [])
      .filter(a => a.district === filterDistrict && a.school)
      .map(a => a.school as string);
    return [...new Set(fromAdmins)].sort();
  }, [filterDistrict, adminsQuery.data]);

  const hasFilters = Boolean(filterDistrict || filterSchool);

  function handleSelectClass(cls: { id: string; name: string; code: string }) {
    navigate(`/class/${cls.id}`, { state: { name: cls.name, code: cls.code } });
  }

  function handleDrillDown(name: string, groupId: string | null, grouping: string) {
    if (groupId) {
      navigate(`/class/${groupId}`);
      return;
    }
    if (grouping === "district") {
      setFilterDistrict(name);
      setFilterSchool("");
    } else if (grouping === "school" && filterDistrict) {
      setFilterSchool(name);
    }
  }

  return (
    <DashboardShell>
      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* ── Stat cards ───────────────────────────────────────── */}
        {isSuperAdmin ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              label="Districts"
              value={superadminStatsQuery.data?.total_districts}
              icon={Building2}
              loading={loading}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-600"
            />
            <StatCard
              label="Schools"
              value={superadminStatsQuery.data?.total_schools}
              icon={School}
              loading={loading}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
            />
            <StatCard
              label="Admins"
              value={superadminStatsQuery.data?.total_admins}
              icon={Shield}
              loading={loading}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              label="Teachers"
              value={superadminStatsQuery.data?.total_teachers}
              icon={Users2}
              loading={loading}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Classes"
              value={superadminStatsQuery.data?.total_classes}
              icon={GraduationCap}
              loading={loading}
              iconBg="bg-cyan-100"
              iconColor="text-cyan-600"
            />
            <StatCard
              label="Students"
              value={superadminStatsQuery.data?.total_students}
              icon={Users}
              loading={loading}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
          </div>
        ) : (
          <>
            {/* Admin scope header — district and school as separate labelled cards */}
            {(profile?.district || profile?.school) && (
              <div className="grid grid-cols-2 gap-3">
                {profile.district && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                        State / District
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-none">
                        {profile.district}
                      </p>
                    </div>
                  </div>
                )}
                {profile.school && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <School className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                        School
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-none">
                        {profile.school}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Teachers"
                value={adminStatsQuery.data?.total_teachers}
                icon={Users2}
                loading={loading}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatCard
                label="Classes"
                value={adminStatsQuery.data?.total_classes}
                icon={GraduationCap}
                loading={loading}
                iconBg="bg-cyan-100"
                iconColor="text-cyan-600"
              />
              <StatCard
                label="Students"
                value={adminStatsQuery.data?.total_students}
                icon={Users}
                loading={loading}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
              />
            </div>
          </>
        )}

        {/* ── SuperAdmin filters ────────────────────────────────── */}
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              Filter by
            </div>

            <Select
              value={filterDistrict}
              onValueChange={(v) => { setFilterDistrict(v === "__all__" ? "" : v); setFilterSchool(""); }}
            >
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__all__">All districts</SelectItem>
                {US_DISTRICTS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterSchool}
              onValueChange={(v) => setFilterSchool(v === "__all__" ? "" : v)}
              disabled={!filterDistrict}
            >
              <SelectTrigger className="w-56 bg-white">
                <SelectValue placeholder={filterDistrict ? "All schools" : "Select district first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All schools</SelectItem>
                {availableSchools.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-slate-500 hover:text-slate-700"
                onClick={() => { setFilterDistrict(""); setFilterSchool(""); }}
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* ── Directory / Combined tabs ──────────────────────────── */}
        <Tabs defaultValue="directory" className="space-y-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="directory" className="gap-1.5 text-xs">
              <List className="w-3.5 h-3.5" />
              Directory
            </TabsTrigger>
            <TabsTrigger value="combined" className="gap-1.5 text-xs">
              <BarChart2 className="w-3.5 h-3.5" />
              Combined
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <TeachersDirectoryTab
              onSelectClass={handleSelectClass}
              isSuperAdmin={isSuperAdmin}
              filterDistrict={filterDistrict || null}
              filterSchool={filterSchool || null}
            />
          </TabsContent>

          <TabsContent value="combined">
            <AggregateAnalyticsTab
              isSuperAdmin={isSuperAdmin}
              filterDistrict={filterDistrict}
              filterSchool={filterSchool}
              onDrillDown={handleDrillDown}
            />
          </TabsContent>
        </Tabs>
      </main>
    </DashboardShell>
  );
}
