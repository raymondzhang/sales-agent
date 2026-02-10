import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Calendar, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useDashboard } from '@/hooks/useApi';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string, t: (key: string) => string) {
  const date = parseISO(dateString);
  if (isToday(date)) return t('dashboard.upcomingMeetings.today');
  if (isTomorrow(date)) return t('dashboard.upcomingMeetings.tomorrow');
  return format(date, 'MMM d, yyyy');
}

function formatTime(dateString: string) {
  return format(parseISO(dateString), 'h:mm a');
}

export function Dashboard() {
  const { t } = useTranslation();
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  const { stats, pipeline, upcomingMeetings, pendingFollowUps, recentLeads } = data || {};
  
  if (!pipeline) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Dashboard data incomplete. Please check API response.</p>
        </div>
      </Layout>
    );
  }

  const pipelineStages = [
    { name: t('pipeline.stages.new'), count: pipeline.new, color: '#3b82f6' },
    { name: t('pipeline.stages.contacted'), count: pipeline.contacted, color: '#eab308' },
    { name: t('pipeline.stages.qualified'), count: pipeline.qualified, color: '#a855f7' },
    { name: t('pipeline.stages.proposal'), count: pipeline.proposal, color: '#f97316' },
    { name: t('pipeline.stages.negotiation'), count: pipeline.negotiation, color: '#ec4899' },
    { name: t('pipeline.stages.closed_won'), count: pipeline.closed_won, color: '#22c55e' },
    { name: t('pipeline.stages.closed_lost'), count: pipeline.closed_lost, color: '#6b7280' },
  ].filter(stage => stage.count > 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.welcome')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t('dashboard.stats.totalLeads')}
            value={stats.totalLeads}
            icon={Users}
          />
          <StatCard
            title={t('dashboard.stats.pipelineValue')}
            value={formatCurrency(stats.totalPipelineValue)}
            icon={DollarSign}
          />
          <StatCard
            title={t('dashboard.stats.upcomingMeetings')}
            value={stats.totalMeetings}
            icon={Calendar}
          />
          <StatCard
            title={t('dashboard.stats.pendingFollowups')}
            value={stats.pendingFollowUps}
            icon={CheckCircle2}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('dashboard.pipeline.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineStages.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-600">{stage.name}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max((stage.count / Math.max(...pipelineStages.map(s => s.count))) * 100, 5)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-semibold text-gray-900">
                      {stage.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentLeads.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {recentLeads.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">{t('common.noData')}</p>
                ) : (
                  recentLeads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.company}</p>
                      </div>
                      <Badge status={lead.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.upcomingMeetings.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {upcomingMeetings.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">{t('common.noData')}</p>
                ) : (
                  upcomingMeetings.slice(0, 5).map((meeting) => (
                    <div key={meeting.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(meeting.scheduledAt, t)} {formatTime(meeting.scheduledAt)}
                          </p>
                          {meeting.location && (
                            <p className="text-xs text-gray-400 mt-0.5">📍 {meeting.location}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{meeting.duration} {t('dashboard.upcomingMeetings.duration')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.pendingFollowups.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {pendingFollowUps.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">{t('common.noData')}</p>
                ) : (
                  pendingFollowUps.slice(0, 5).map((followUp) => (
                    <div key={followUp.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Badge status={followUp.type} />
                          <div>
                            <p className="text-sm text-gray-900">{followUp.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('dashboard.pendingFollowups.due')}: {formatDate(followUp.scheduledAt, t)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
