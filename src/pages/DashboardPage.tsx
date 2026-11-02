import { useQuery } from '@tanstack/react-query';
import { ActivityMeetings } from '@/components/dashboard/ActivityMeetings';
import { Charts } from '@/components/dashboard/Charts';
import { Hero } from '@/components/dashboard/Hero';
import { MetricCard, type DashboardMetric } from '@/components/dashboard/MetricCard';
import { ModelStatus } from '@/components/dashboard/ModelStatus';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { StudentCards } from '@/components/dashboard/StudentCards';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getAnalyticsSummary, getModelInfo } from '@/services/dashboard';
import { listInterventions } from '@/services/interventions';
import { listNotifications } from '@/services/notifications';
import { listLatestPredictions } from '@/services/predictions';
import { listStudents } from '@/services/students';

export function DashboardPage() {
  const { user } = useAuth();

  const summaryQuery = useQuery({ queryKey: ['analytics-summary'], queryFn: getAnalyticsSummary });
  const modelInfoQuery = useQuery({ queryKey: ['model-info'], queryFn: getModelInfo });
  const priorityQuery = useQuery({ queryKey: ['latest-predictions', 'top6'], queryFn: () => listLatestPredictions(6) });
  const interventionsQuery = useQuery({ queryKey: ['interventions'], queryFn: () => listInterventions() });
  const studentsQuery = useQuery({ queryKey: ['students'], queryFn: () => listStudents() });
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });

  if (summaryQuery.isLoading || modelInfoQuery.isLoading) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Loading dashboard…</div>;
  }
  if (!summaryQuery.data || !modelInfoQuery.data) {
    return <div className="grid min-h-[50vh] place-items-center text-slate-500 dark:text-slate-400">Unable to load dashboard data.</div>;
  }

  const summary = summaryQuery.data;
  const modelInfo = modelInfoQuery.data;
  const accuracyPct = Math.round(modelInfo.metrics.accuracy * 1000) / 10;
  const interventions = interventionsQuery.data ?? [];
  const openInterventions = interventions.filter((i) => i.status !== 'completed');
  const activeInterventions = openInterventions.length;
  const openInterventionStudentIds = new Set(openInterventions.map((i) => i.studentId));

  const studentNameById = new Map((studentsQuery.data ?? []).map((s) => [s.id, s.name]));
  const upcomingMeetings = interventions
    .filter((i) => i.nextMeetingAt && new Date(i.nextMeetingAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.nextMeetingAt!).getTime() - new Date(b.nextMeetingAt!).getTime())
    .slice(0, 5)
    .map((i) => ({ ...i, studentName: studentNameById.get(i.studentId) ?? 'Unknown student' }));

  const metrics: DashboardMetric[] = [
    { label: 'Total Students', value: summary.totalStudents.toLocaleString(), note: 'Loaded from the UCI dataset', tone: 'primary' },
    { label: 'High Risk', value: String(summary.riskDistribution.HIGH), note: 'Latest predictions', tone: 'danger' },
    { label: 'Medium Risk', value: String(summary.riskDistribution.MEDIUM), note: 'Latest predictions', tone: 'warning' },
    { label: 'Low Risk', value: String(summary.riskDistribution.LOW), note: 'Latest predictions', tone: 'success' },
    { label: 'Interventions', value: String(activeInterventions), note: 'Currently active', tone: 'info' },
    { label: 'Model Accuracy', value: `${accuracyPct}%`, note: 'Held-out test split', tone: 'primary' },
  ];

  return (
    <div className="space-y-7">
      <Hero
        firstName={user?.name?.split(' ').find((part) => !part.endsWith('.')) ?? 'there'}
        highRiskCount={summary.riskDistribution.HIGH}
        totalStudents={summary.totalStudents}
        activeInterventions={activeInterventions}
        accuracyPct={accuracyPct}
        modelVersion={modelInfo.modelVersion}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} />)}
      </section>
      <QuickActions />
      <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
        <Charts summary={summary} />
        <ModelStatus modelInfo={modelInfo} totalStudents={summary.totalStudents} />
      </div>
      <StudentCards students={priorityQuery.data ?? []} openInterventionStudentIds={openInterventionStudentIds} />
      <ActivityMeetings notifications={notificationsQuery.data ?? []} upcomingMeetings={upcomingMeetings} />
    </div>
  );
}
