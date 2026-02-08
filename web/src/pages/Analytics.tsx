import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Mail, Calendar, Target } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { usePipeline, useSalesReport } from '@/hooks/useApi';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const COLORS = ['#3b82f6', '#eab308', '#a855f7', '#f97316', '#ec4899', '#22c55e', '#6b7280'];

export function Analytics() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'30d' | 'month' | 'all'>('30d');
  
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '30d':
        return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
      case 'month':
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'all':
        return { from: undefined, to: undefined };
      default:
        return { from: undefined, to: undefined };
    }
  };

  const { from, to } = getDateRange();
  const { pipeline } = usePipeline();
  const { report } = useSalesReport(from, to);

  // Prepare pipeline chart data
  const pipelineData = pipeline?.pipeline
    ? Object.entries(pipeline.pipeline).map(([stage, data]: [string, any]) => ({
        name: t(`pipeline.stages.${stage}`),
        count: data.count,
        value: data.value,
      }))
    : [];

  // Prepare leads by status data
  const leadsByStatusData = report?.leads
    ? Object.entries(report.leads).map(([status, count]) => ({
        name: t(`leads.status.${status}`),
        value: count,
      }))
    : [];

  // Prepare activity data
  const activityData = report?.activity?.emailsByDay
    ? Object.entries(report.activity.emailsByDay).map(([date, count]) => ({
        date: format(new Date(date), 'MMM d'),
        emails: count,
      }))
    : [];

  const dateRangeOptions = [
    { key: '30d', label: t('analytics.dateRanges.30d') },
    { key: 'month', label: t('analytics.dateRanges.month') },
    { key: 'all', label: t('analytics.dateRanges.all') },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
            <p className="text-gray-600 mt-1">{t('analytics.subtitle')}</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['30d', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {dateRangeOptions.find(o => o.key === range)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('analytics.metrics.totalRevenue')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(report.revenue.total)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('analytics.metrics.winRate')}</p>
                    <p className="text-2xl font-bold text-gray-900">{report.revenue.winRate}%</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('analytics.metrics.emailsSent')}</p>
                    <p className="text-2xl font-bold text-gray-900">{report.activity.emailsSent}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('analytics.metrics.meetings')}</p>
                    <p className="text-2xl font-bold text-gray-900">{report.activity.meetingsScheduled}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by Value */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.charts.pipelineByValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads by Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.charts.leadsByStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsByStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadsByStatusData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by Count */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.charts.pipelineByCount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.charts.emailActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="emails" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        {pipeline?.summary && (
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.summary.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{pipeline.summary.totalLeads}</p>
                  <p className="text-sm text-gray-600">{t('analytics.summary.totalLeads')}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{pipeline.summary.activeLeads}</p>
                  <p className="text-sm text-gray-600">{t('analytics.summary.activeLeads')}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(pipeline.summary.totalPipelineValue)}
                  </p>
                  <p className="text-sm text-gray-600">{t('analytics.summary.pipelineValue')}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{pipeline.summary.winRate}</p>
                  <p className="text-sm text-gray-600">{t('analytics.summary.winRate')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
