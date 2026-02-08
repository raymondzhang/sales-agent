import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, Clock, MapPin, Video, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Input, Select, Textarea } from '@/components/Input';
import { useMeetings, useLeads } from '@/hooks/useApi';
import type { Meeting } from '@/types';
import { format, parseISO, isToday, isTomorrow, addWeeks } from 'date-fns';

function formatMeetingDate(dateString: string, t: (key: string) => string) {
  const date = parseISO(dateString);
  if (isToday(date)) return t('meetings.list.today');
  if (isTomorrow(date)) return t('meetings.list.tomorrow');
  return format(date, 'EEEE, MMM d');
}

function formatMeetingTime(dateString: string) {
  return format(parseISO(dateString), 'h:mm a');
}

export function Meetings() {
  const { t } = useTranslation();
  const { meetings, loading, createMeeting, deleteMeeting } = useMeetings();
  const { leads } = useLeads();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Group meetings by date
  const groupedMeetings = meetings.reduce((groups, meeting) => {
    const date = format(parseISO(meeting.scheduledAt), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(meeting);
    return groups;
  }, {} as Record<string, Meeting[]>);

  const sortedDates = Object.keys(groupedMeetings).sort();

  const handleCreateMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    
    await createMeeting({
      leadId: formData.get('leadId') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      scheduledAt,
      duration: Number(formData.get('duration')) || 30,
      location: formData.get('location') as string,
      meetingLink: formData.get('meetingLink') as string,
    });
    
    setIsCreateModalOpen(false);
  };

  const upcomingMeetings = meetings
    .filter(m => new Date(m.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const durationOptions = [
    { value: '15', label: t('meetings.durationOptions.15') },
    { value: '30', label: t('meetings.durationOptions.30') },
    { value: '45', label: t('meetings.durationOptions.45') },
    { value: '60', label: t('meetings.durationOptions.60') },
    { value: '90', label: t('meetings.durationOptions.90') },
    { value: '120', label: t('meetings.durationOptions.120') },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('meetings.title')}</h1>
            <p className="text-gray-600 mt-1">{t('meetings.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {t('meetings.viewModes.list')}
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {t('meetings.viewModes.calendar')}
              </button>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('meetings.scheduleMeeting')}
            </Button>
          </div>
        </div>

        {/* Upcoming Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('meetings.stats.upcoming')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {upcomingMeetings.filter(m => m.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('meetings.stats.thisWeek')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {upcomingMeetings.filter(m => {
                      const meetingDate = parseISO(m.scheduledAt);
                      const weekFromNow = addWeeks(new Date(), 1);
                      return meetingDate <= weekFromNow;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('meetings.stats.virtual')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {upcomingMeetings.filter(m => m.meetingLink).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetings List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('meetings.list.upcoming')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-gray-500">{t('common.loading')}</div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {t('meetings.list.noMeetings')}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sortedDates.map((date) => (
                  <div key={date} className="p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      {formatMeetingDate(date + 'T00:00:00', t)}
                    </h3>
                    <div className="space-y-4">
                      {groupedMeetings[date]
                        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                        .map((meeting) => (
                          <div
                            key={meeting.id}
                            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatMeetingTime(meeting.scheduledAt)}
                                </p>
                                <p className="text-xs text-gray-500">{meeting.duration} {t('dashboard.upcomingMeetings.duration')}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                                {meeting.description && (
                                  <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  {meeting.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {meeting.location}
                                    </span>
                                  )}
                                  {meeting.meetingLink && (
                                    <a
                                      href={meeting.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-primary-600 hover:underline"
                                    >
                                      <Video className="w-3 h-3" />
                                      {t('meetings.list.joinMeeting')}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge status={meeting.status} />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMeeting(meeting.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Meeting Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('meetings.form.title')}
        className="sm:max-w-lg"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <Select
            name="leadId"
            label={t('meetings.form.lead')}
            required
            options={[
              { value: '', label: t('meetings.form.selectLead') },
              ...leads.map(l => ({ value: l.id, label: `${l.name} - ${l.company}` }))
            ]}
          />
          <Input name="title" label={t('meetings.form.meetingTitle')} placeholder="Discovery Call" required />
          <Textarea name="description" label={t('meetings.form.description')} rows={2} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" label={t('meetings.form.date')} type="date" required />
            <Input name="time" label={t('meetings.form.time')} type="time" required />
          </div>
          
          <Select
            name="duration"
            label={t('meetings.form.duration')}
            options={durationOptions}
          />
          
          <Input name="location" label={t('meetings.form.location')} placeholder={t('meetings.form.locationPlaceholder')} />
          <Input name="meetingLink" label={t('meetings.form.meetingLink')} placeholder={t('meetings.form.linkPlaceholder')} />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('meetings.scheduleMeeting')}</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
