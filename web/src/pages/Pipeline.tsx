import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { usePipeline, useLeads } from '@/hooks/useApi';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Select } from '@/components/Input';
import type { Lead, LeadStatus } from '@/types';
import { formatCurrency } from '@/utils/format';

export function Pipeline() {
  const { t } = useTranslation();
  const { pipeline, loading: _pipelineLoading } = usePipeline();
  const { leads: _leads, updateLead } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stages: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: t('pipeline.stages.new'), color: 'bg-blue-500' },
    { id: 'contacted', label: t('pipeline.stages.contacted'), color: 'bg-yellow-500' },
    { id: 'qualified', label: t('pipeline.stages.qualified'), color: 'bg-purple-500' },
    { id: 'proposal', label: t('pipeline.stages.proposal'), color: 'bg-orange-500' },
    { id: 'negotiation', label: t('pipeline.stages.negotiation'), color: 'bg-pink-500' },
    { id: 'closed_won', label: t('pipeline.stages.closed_won'), color: 'bg-green-500' },
    { id: 'closed_lost', label: t('pipeline.stages.closed_lost'), color: 'bg-gray-500' },
  ];

  const statusOptions = stages.map(s => ({ value: s.id, label: s.label }));

  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (selectedLead) {
      await updateLead(selectedLead.id, { status: newStatus });
      setIsModalOpen(false);
      setSelectedLead(null);
    }
  };

  const stageData = pipeline?.pipeline || {};

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pipeline.title')}</h1>
          <p className="text-gray-600 mt-1">{t('pipeline.subtitle')}</p>
        </div>

        {/* Summary Stats */}
        {pipeline?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">{t('pipeline.summary.totalLeads')}</p>
                <p className="text-2xl font-bold text-gray-900">{pipeline.summary.totalLeads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">{t('pipeline.summary.activeLeads')}</p>
                <p className="text-2xl font-bold text-primary-600">{pipeline.summary.activeLeads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">{t('pipeline.summary.pipelineValue')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pipeline.summary.totalPipelineValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">{t('pipeline.summary.winRate')}</p>
                <p className="text-2xl font-bold text-green-600">{pipeline.summary.winRate}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageInfo = stageData[stage.id] || { count: 0, value: 0, leads: [] };
            const stageLeads = stageInfo.leads || [];

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <div className="bg-gray-100 rounded-lg p-4">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                    </div>
                    <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                      {stageInfo.count}
                    </span>
                  </div>

                  {/* Stage Value */}
                  <p className="text-sm text-gray-600 mb-4">
                    {formatCurrency(stageInfo.value)}
                  </p>

                  {/* Leads */}
                  <div className="space-y-3">
                    {stageLeads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }}
                        className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                            <p className="text-xs text-gray-500">{lead.company}</p>
                          </div>
                          <Badge status={lead.priority} />
                        </div>
                        {lead.estimatedValue && (
                          <p className="mt-2 text-sm font-medium text-gray-900">
                            {formatCurrency(lead.estimatedValue)}
                          </p>
                        )}
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {t('pipeline.noLeads')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedLead.name}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{t('leads.table.company')}</p>
              <p className="font-medium">{selectedLead.company}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('leads.create.email')}</p>
              <p className="font-medium">{selectedLead.email}</p>
            </div>
            {selectedLead.estimatedValue && (
              <div>
                <p className="text-sm text-gray-500">{t('leads.table.value')}</p>
                <p className="font-medium">{formatCurrency(selectedLead.estimatedValue)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 mb-2">{t('pipeline.moveToStage')}</p>
              <Select
                value={selectedLead.status}
                onChange={(e) => handleUpdateStatus(e.target.value as LeadStatus)}
                options={statusOptions}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
