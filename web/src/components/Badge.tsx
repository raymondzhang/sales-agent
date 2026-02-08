import { useTranslation } from 'react-i18next';
import { cn } from './Card';
import type { LeadStatus, LeadPriority, MeetingStatus, FollowUpType } from '@/types';

const statusColors: Record<string, string> = {
  // Lead statuses
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  negotiation: 'bg-pink-100 text-pink-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-gray-100 text-gray-800',
  // Priorities
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
  // Meeting statuses
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  no_show: 'bg-red-100 text-red-800',
  // Follow-up types
  email: 'bg-blue-100 text-blue-800',
  call: 'bg-green-100 text-green-800',
  meeting: 'bg-purple-100 text-purple-800',
  task: 'bg-orange-100 text-orange-800',
};

interface BadgeProps {
  status: LeadStatus | LeadPriority | MeetingStatus | FollowUpType | string;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const { t } = useTranslation();
  
  // Map status to translation key
  const getStatusLabel = (status: string): string => {
    const translationKeys: Record<string, string> = {
      // Lead statuses
      new: 'leads.status.new',
      contacted: 'leads.status.contacted',
      qualified: 'leads.status.qualified',
      proposal: 'leads.status.proposal',
      negotiation: 'leads.status.negotiation',
      closed_won: 'leads.status.closed_won',
      closed_lost: 'leads.status.closed_lost',
      // Priorities
      high: 'leads.priority.high',
      medium: 'leads.priority.medium',
      low: 'leads.priority.low',
      // Meeting statuses
      scheduled: 'meetings.status.scheduled',
      completed: 'meetings.status.completed',
      cancelled: 'meetings.status.cancelled',
      no_show: 'meetings.status.no_show',
      // Follow-up types
      email: 'templates.categories.email',
      call: 'templates.categories.call',
      meeting: 'templates.categories.meeting',
      task: 'templates.categories.task',
    };
    
    const key = translationKeys[status];
    if (key) {
      const translated = t(key);
      // If translation returns the key itself, fallback to status
      return translated === key ? status : translated;
    }
    return status;
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusColors[status] || 'bg-gray-100 text-gray-800',
      className
    )}>
      {getStatusLabel(status)}
    </span>
  );
}
