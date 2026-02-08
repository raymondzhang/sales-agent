import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Mail, Copy, Check, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input, Select, Textarea } from '@/components/Input';
import { useEmailTemplates } from '@/hooks/useApi';
import type { EmailTemplate } from '@/types';

export function Templates() {
  const { t } = useTranslation();
  const { templates, loading, createTemplate, deleteTemplate } = useEmailTemplates();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categoryOptions = [
    { value: 'introduction', label: t('templates.categories.introduction') },
    { value: 'follow_up', label: t('templates.categories.follow_up') },
    { value: 'proposal', label: t('templates.categories.proposal') },
    { value: 'reminder', label: t('templates.categories.reminder') },
    { value: 'custom', label: t('templates.categories.custom') },
  ];

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const variables = (formData.get('variables') as string)
      .split(',')
      .map(v => v.trim())
      .filter(v => v);
    
    await createTemplate({
      name: formData.get('name') as string,
      subject: formData.get('subject') as string,
      body: formData.get('body') as string,
      category: formData.get('category') as EmailTemplate['category'],
      variables,
    });
    
    setIsCreateModalOpen(false);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      introduction: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-yellow-100 text-yellow-800',
      proposal: 'bg-green-100 text-green-800',
      reminder: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.custom;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      introduction: t('templates.categories.introduction'),
      follow_up: t('templates.categories.follow_up'),
      proposal: t('templates.categories.proposal'),
      reminder: t('templates.categories.reminder'),
      custom: t('templates.categories.custom'),
    };
    return labels[category] || category;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('templates.title')}</h1>
            <p className="text-gray-600 mt-1">{t('templates.subtitle')}</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('templates.createTemplate')}
          </Button>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('templates.noTemplates')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${getCategoryColor(template.category)}`}>
                        {getCategoryLabel(template.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(template.body, template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t('common.confirmDelete'))) {
                            deleteTemplate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('templates.preview.subject')}</p>
                      <p className="text-sm text-gray-900 truncate">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('templates.preview.body')}</p>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {template.body.substring(0, 150)}
                        {template.body.length > 150 ? '...' : ''}
                      </p>
                    </div>
                    {template.variables.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('templates.preview.variables')}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable) => (
                            <span
                              key={variable}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {`{{${variable}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('templates.form.title')}
        className="sm:max-w-2xl"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="name" label={t('templates.form.name')} placeholder="Introduction Email" required />
            <Select name="category" label={t('templates.form.category')} options={categoryOptions} required />
          </div>
          
          <Input
            name="subject"
            label={t('templates.form.subject')}
            placeholder={t('templates.form.subjectPlaceholder')}
            required
          />
          
          <Textarea
            name="body"
            label={t('templates.form.body')}
            rows={10}
            placeholder={t('templates.form.bodyPlaceholder')}
            required
          />
          
          <Input
            name="variables"
            label={t('templates.form.variables')}
            placeholder={t('templates.form.variablesPlaceholder')}
          />
          
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">{t('common.tip')}</p>
            <p>{t('templates.form.tip')}</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.create')}</Button>
          </div>
        </form>
      </Modal>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          className="sm:max-w-2xl"
        >
          <div className="space-y-4">
            <div>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(selectedTemplate.category)}`}>
                {getCategoryLabel(selectedTemplate.category)}
              </span>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('templates.preview.subject')}</p>
              <p className="text-sm font-medium text-gray-900">{selectedTemplate.subject}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('templates.preview.body')}</p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                {selectedTemplate.body}
              </div>
            </div>
            
            {selectedTemplate.variables.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('templates.preview.variables')}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => handleCopy(selectedTemplate.body, selectedTemplate.id)}
              >
                {copiedId === selectedTemplate.id ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('common.copy')} {t('templates.preview.body')}
                  </>
                )}
              </Button>
              <Button onClick={() => setSelectedTemplate(null)}>{t('common.close')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
