import { useNavigate } from 'react-router-dom';
import { Activity, CalendarClock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Intervention, Notification } from '@/types/contract';

interface ActivityMeetingsProps {
  notifications: Notification[];
  upcomingMeetings: (Intervention & { studentName: string })[];
}

export function ActivityMeetings({ notifications, upcomingMeetings }: ActivityMeetingsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950"><Activity size={19} /></span>
          <div><h3 className="font-bold">Recent activity</h3><p className="text-sm text-slate-500">Latest platform notifications</p></div>
        </div>
        <div className="mt-5 space-y-1">
          {notifications.slice(0, 6).map((item) => (
            <div key={item.id} className="flex gap-3 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="mt-2 size-2 rounded-full bg-[#0ea5e9]" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No recent activity.</p>}
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950"><CalendarClock size={19} /></span>
          <div><h3 className="font-bold">Upcoming advisor meetings</h3><p className="text-sm text-slate-500">Scheduled student reviews</p></div>
        </div>
        <div className="mt-5 space-y-3">
          {upcomingMeetings.map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => navigate(`/students/${meeting.studentId}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left transition hover:border-[#ADDFF1] dark:border-slate-800"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-xs font-bold dark:bg-slate-800">
                {new Date(meeting.nextMeetingAt!).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{meeting.studentName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meeting.tier === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{meeting.tier}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{meeting.recommendedActions[0] ?? 'Support plan'}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(meeting.nextMeetingAt!).toLocaleString()}</p>
              </div>
              <ChevronRight className="text-slate-400" size={18} />
            </button>
          ))}
          {upcomingMeetings.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No meetings scheduled yet.</p>}
        </div>
      </Card>
    </div>
  );
}
