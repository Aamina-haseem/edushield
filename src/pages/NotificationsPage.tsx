import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Pill, SectionTitle } from '@/components/common/Page';
import { useAuth } from '@/features/auth/context/AuthContext';
import { listNotifications, markNotificationRead } from '@/services/notifications';
import type { NotificationType } from '@/types/contract';

const typeTone: Record<NotificationType, 'red' | 'amber' | 'blue' | 'green'> = {
  prediction: 'red',
  intervention: 'amber',
  meeting: 'blue',
  system: 'green',
};
const TYPES: NotificationType[] = ['prediction', 'intervention', 'meeting', 'system'];

export function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read);

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => markNotificationRead(id))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace alerts"
        title="Notifications"
        description="Stay informed about risk changes, advisor actions, model events and intervention deadlines."
        actions={
          <Button onClick={() => markReadMutation.mutate(unread.map((n) => n.id))} disabled={unread.length === 0 || markReadMutation.isPending}>
            <CheckCheck size={16} />Mark all read
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <SectionTitle title="Latest notifications" description={`${unread.length} unread of ${notifications.length}`} />
          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading notifications…</p>}
            {isError && <p className="text-sm text-red-600 dark:text-red-300">Unable to load notifications right now.</p>}
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`flex gap-4 rounded-3xl border p-5 ${notification.read ? 'border-slate-200 dark:border-slate-800' : 'border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/20'}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-[#003152] dark:bg-slate-800 dark:text-sky-200"><Bell size={19} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{notification.title}</p>
                    <Pill tone={typeTone[notification.type]}>{new Date(notification.createdAt).toLocaleString()}</Pill>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                    {!notification.read && (
                      <button className="text-sky-700 dark:text-sky-300" onClick={() => markReadMutation.mutate([notification.id])} disabled={markReadMutation.isPending}>
                        Mark as read
                      </button>
                    )}
                    {notification.relatedStudentId && user?.role !== 'student' && (
                      <Link className="text-sky-700 dark:text-sky-300" to={`/students/${notification.relatedStudentId}`}>Open student</Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!isLoading && !isError && notifications.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">You're all caught up — no notifications yet.</p>
            )}
          </div>
        </Card>
        <Card className="h-fit p-6">
          <SectionTitle title="By type" />
          <div className="mt-5 space-y-3">
            {TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <Pill tone={typeTone[type]}>{type}</Pill>
                <span className="font-bold">{notifications.filter((n) => n.type === type).length}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
