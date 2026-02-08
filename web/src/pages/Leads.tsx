import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Trash2, FileText } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Input, Select, Textarea } from '@/components/Input';
import { useLeads } from '@/hooks/useApi';
import type { Lead, LeadStatus, LeadPriority } from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function Leads() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<{ status?: LeadStatus; priority?: LeadPriority }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  const { leads, loading, createLead, deleteLead, addNote } = useLeads(filters);

  const filteredLeads = leads.filter(lead =>
    searchQuery === '' ||
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusOptions = [
    { value: '', label: t('leads.filters.allStatuses') },
    { value: 'new', label: t('leads.status.new') },
    { value: 'contacted', label: t('leads.status.contacted') },
    { value: 'qualified', label: t('leads.status.qualified') },
    { value: 'proposal', label: t('leads.status.proposal') },
    { value: 'negotiation', label: t('leads.status.negotiation') },
    { value: 'closed_won', label: t('leads.status.closed_won') },
    { value: 'closed_lost', label: t('leads.status.closed_lost') },
  ];

  const priorityOptions = [
    { value: '', label: t('leads.filters.allPriorities') },
    { value: 'high', label: t('leads.priority.high') },
    { value: 'medium', label: t('leads.priority.medium') },
    { value: 'low', label: t('leads.priority.low') },
  ];

  const leadStatusOptions = statusOptions.filter(o => o.value !== '');
  const leadPriorityOptions = priorityOptions.filter(o => o.value !== '');

  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await createLead({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      company: formData.get('company') as string,
      title: formData.get('title') as string,
      source: formData.get('source') as string,
      status: (formData.get('status') as LeadStatus) || 'new',
      priority: (formData.get('priority') as LeadPriority) || 'medium',
      estimatedValue: Number(formData.get('estimatedValue')) || undefined,
      notes: formData.get('notes') ? [formData.get('notes') as string] : [],
      tags: [],
    });
    
    setIsCreateModalOpen(false);
  };

  const handleAddNote = async () => {
    if (selectedLead && newNote.trim()) {
      await addNote(selectedLead.id, newNote);
      setNewNote('');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (confirm(t('common.confirmDelete'))) {
      await deleteLead(leadId);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('leads.title')}</h1>
            <p className="text-gray-600 mt-1">{t('leads.subtitle')}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('leads.addLead')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('leads.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <Select
                value={filters.status || ''}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as LeadStatus }))}
                options={statusOptions}
                className="w-40"
              />
              <Select
                value={filters.priority || ''}
                onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value as LeadPriority }))}
                options={priorityOptions}
                className="w-40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leads.table.lead')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leads.table.company')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leads.table.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leads.table.priority')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leads.table.value')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {t('leads.noLeads')}
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                            <p className="text-xs text-gray-500">{lead.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{lead.company}</td>
                        <td className="px-6 py-4">
                          <Badge status={lead.status} />
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={lead.priority} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedLead(lead); setIsDetailModalOpen(true); }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Lead Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('leads.create.title')}
        className="sm:max-w-xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="name" label={t('leads.create.name')} required />
            <Input name="email" label={t('leads.create.email')} type="email" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="company" label={t('leads.create.company')} required />
            <Input name="phone" label={t('leads.create.phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="title" label={t('leads.create.title_label')} />
            <Input name="source" label={t('leads.create.source')} placeholder={t('leads.create.sourcePlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select name="status" label={t('leads.create.status')} options={leadStatusOptions} />
            <Select name="priority" label={t('leads.create.priority')} options={leadPriorityOptions} />
          </div>
          <Input name="estimatedValue" label={t('leads.create.estimatedValue')} type="number" />
          <Textarea name="notes" label={t('leads.create.notes')} rows={3} />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.create')}</Button>
          </div>
        </form>
      </Modal>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedLead.name}
          className="sm:max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('leads.table.company')}:</span>
                <span className="ml-2 font-medium">{selectedLead.company}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.create.email')}:</span>
                <span className="ml-2 font-medium">{selectedLead.email}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.create.phone')}:</span>
                <span className="ml-2 font-medium">{selectedLead.phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.create.title_label')}:</span>
                <span className="ml-2 font-medium">{selectedLead.title || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.table.status')}:</span>
                <span className="ml-2"><Badge status={selectedLead.status} /></span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.table.priority')}:</span>
                <span className="ml-2"><Badge status={selectedLead.priority} /></span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.create.source')}:</span>
                <span className="ml-2 font-medium">{selectedLead.source}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('leads.table.value')}:</span>
                <span className="ml-2 font-medium">
                  {selectedLead.estimatedValue ? formatCurrency(selectedLead.estimatedValue) : '-'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t('leads.detail.notes')}</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {selectedLead.notes.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('leads.detail.noNotes')}</p>
                ) : (
                  selectedLead.notes.map((note, idx) => (
                    <p key={idx} className="text-sm text-gray-700">{note}</p>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t('leads.detail.addNote')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <Button size="sm" onClick={handleAddNote}>{t('common.add')}</Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
