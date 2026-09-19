import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, X, Save, History, Edit2, Trash2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Campaign-specific field names
const CAMPAIGN_FIELDS = ['campaign_channel', 'campaign_products'];

export default function CampaignSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentFieldName, setCurrentFieldName] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);
  const [newField, setNewField] = useState({ field_name: '', display_label: '', options: [''] });
  const [deleteField, setDeleteField] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API}/dropdown-configs`, {
        headers: getAuthHeaders()
      });
      // Filter to show campaign fields and custom fields that start with 'campaign_'
      const campaignConfigs = response.data.filter(config => 
        CAMPAIGN_FIELDS.includes(config.field_name) || 
        (config.is_custom && config.field_name.startsWith('campaign_'))
      );
      setConfigs(campaignConfigs);
    } catch (error) {
      toast.error('Failed to fetch dropdown configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = (fieldName) => {
    setConfigs(prev =>
      prev.map(config =>
        config.field_name === fieldName
          ? { ...config, options: [...config.options, ''] }
          : config
      )
    );
  };

  const handleRemoveOption = (fieldName, index) => {
    setConfigs(prev =>
      prev.map(config =>
        config.field_name === fieldName
          ? { ...config, options: config.options.filter((_, i) => i !== index) }
          : config
      )
    );
  };

  const handleOptionChange = (fieldName, index, value) => {
    setConfigs(prev =>
      prev.map(config =>
        config.field_name === fieldName
          ? {
              ...config,
              options: config.options.map((opt, i) => (i === index ? value : opt))
            }
          : config
      )
    );
  };

  const handleSave = async (fieldName) => {
    setSaving(fieldName);
    try {
      const config = configs.find(c => c.field_name === fieldName);
      const filteredOptions = config.options.filter(opt => opt.trim() !== '');
      
      if (filteredOptions.length === 0) {
        toast.error('At least one option is required');
        setSaving(null);
        return;
      }

      await axios.put(
        `${API}/dropdown-configs/${fieldName}`,
        filteredOptions,
        { headers: getAuthHeaders() }
      );
      
      toast.success(`${config.display_label} options updated successfully`);
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update dropdown options');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveLabel = async (fieldName) => {
    try {
      await axios.put(
        `${API}/dropdown-configs/${fieldName}/label?display_label=${encodeURIComponent(newLabel)}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('Field label updated successfully');
      setEditingLabel(null);
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to update field label');
    }
  };

  const handleDeleteField = async () => {
    const fieldName = deleteField?.field_name;
    if (!fieldName) return;

    try {
      await axios.delete(`${API}/dropdown-configs/${fieldName}`, {
        headers: getAuthHeaders()
      });
      toast.success('Field deleted successfully');
      setDeleteField(null);
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete field');
    }
  };

  const handleCreateField = async () => {
    try {
      const filteredOptions = newField.options.filter(opt => opt.trim() !== '');
      
      // Ensure field name starts with campaign_
      const fieldName = newField.field_name.startsWith('campaign_') 
        ? newField.field_name 
        : `campaign_${newField.field_name}`;

      if (!newField.field_name || !newField.display_label) {
        toast.error('Field name and display label are required');
        return;
      }

      if (filteredOptions.length === 0) {
        toast.error('At least one option is required');
        return;
      }

      await axios.post(
        `${API}/dropdown-configs?field_name=${fieldName}&display_label=${encodeURIComponent(newField.display_label)}`,
        filteredOptions,
        { headers: getAuthHeaders() }
      );
      
      toast.success('Custom campaign field created successfully');
      setShowNewFieldDialog(false);
      setNewField({ field_name: '', display_label: '', options: [''] });
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create field');
    }
  };

  const handleViewHistory = async (fieldName) => {
    setCurrentFieldName(fieldName);
    setShowHistory(true);
    setLoadingLogs(true);
    
    try {
      const response = await axios.get(`${API}/audit-logs`, {
        headers: getAuthHeaders(),
        params: { field_name: fieldName, limit: 20 }
      });
      setAuditLogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch audit history');
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderValueChange = (oldValues, newValues) => {
    const added = newValues.filter(v => !oldValues.includes(v));
    const removed = oldValues.filter(v => !newValues.includes(v));
    
    return (
      <div className="text-sm space-y-1">
        {added.length > 0 && (
          <div className="text-green-700">
            <span className="font-medium">Added:</span> {added.join(', ')}
          </div>
        )}
        {removed.length > 0 && (
          <div className="text-red-700">
            <span className="font-medium">Removed:</span> {removed.join(', ')}
          </div>
        )}
        {added.length === 0 && removed.length === 0 && (
          <div className="text-muted-foreground">Options reordered or unchanged</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout pageTitle="Campaign Settings">
        <div className="text-center py-12 text-sm text-muted-foreground">Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Campaign Settings">
      <div className="max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-foreground">Campaign Field Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Manage dropdown options for campaign fields. Changes will apply to all campaign forms.
            </p>
          </div>
          <Button
            onClick={() => setShowNewFieldDialog(true)}
            data-testid="create-new-campaign-field"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Create Campaign Field
          </Button>
        </div>

        <div className="space-y-6">
          {configs.map((config) => (
            <div
              key={config.field_name}
              className="glass-card rounded-2xl p-6"
              data-testid={`config-${config.field_name}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {editingLabel === config.field_name ? (
                    <>
                      <Input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="w-64 rounded-xl border border-input"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveLabel(config.field_name)}
                        className="rounded-xl"
                      >
                        <Check className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLabel(null)}
                        className="rounded-xl"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Label className="text-base font-semibold tracking-tight">
                        {config.display_label || config.field_name}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingLabel(config.field_name);
                          setNewLabel(config.display_label || config.field_name);
                        }}
                        data-testid={`edit-label-${config.field_name}`}
                        className="rounded-xl hover:bg-muted p-1"
                      >
                        <Edit2 className="h-3 w-3" strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteField(config)}
                        data-testid={`delete-field-${config.field_name}`}
                        title="Remove Field"
                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewHistory(config.field_name)}
                    data-testid={`view-history-${config.field_name}`}
                    className="rounded-xl hover:bg-muted"
                  >
                    <History className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    View History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddOption(config.field_name)}
                    data-testid={`add-option-${config.field_name}`}
                    className="rounded-xl hover:bg-muted"
                  >
                    <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Add Option
                  </Button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {config.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(config.field_name, index, e.target.value)}
                      data-testid={`option-input-${config.field_name}-${index}`}
                      placeholder="Enter option value"
                      className="rounded-xl border border-input"
                    />
                    {config.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(config.field_name, index)}
                        data-testid={`remove-option-${config.field_name}-${index}`}
                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleSave(config.field_name)}
                disabled={saving === config.field_name}
                data-testid={`save-${config.field_name}`}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/20"
              >
                <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />
                {saving === config.field_name ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ))}
        </div>

        {/* Audit History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Change History: {configs.find(c => c.field_name === currentFieldName)?.display_label || currentFieldName}
              </DialogTitle>
              <DialogDescription>
                Track all modifications made to this campaign field configuration
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {loadingLogs ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading history...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No change history found for this field
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-border rounded-xl p-4 bg-muted/30"
                      data-testid={`audit-log-${log.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {log.user_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(log.timestamp)}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      {renderValueChange(log.old_values, log.new_values)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create New Campaign Field Dialog */}
        <Dialog open={showNewFieldDialog} onOpenChange={setShowNewFieldDialog}>
          <DialogContent className="rounded-2xl max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Create New Campaign Field
              </DialogTitle>
              <DialogDescription>
                Add a new dropdown field to campaign forms. Field name will be prefixed with 'campaign_'.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="field_name" className="text-xs uppercase tracking-wider font-medium">
                  Field Name (lowercase, no spaces) *
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">campaign_</span>
                  <Input
                    id="field_name"
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="e.g., status, priority, type"
                    data-testid="new-campaign-field-name"
                    className="rounded-xl border border-input flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_label" className="text-xs uppercase tracking-wider font-medium">
                  Display Label (What users see) *
                </Label>
                <Input
                  id="display_label"
                  value={newField.display_label}
                  onChange={(e) => setNewField({ ...newField, display_label: e.target.value })}
                  placeholder="e.g., Campaign Status, Priority Level"
                  data-testid="new-campaign-field-label"
                  className="rounded-xl border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-medium">
                  Dropdown Options *
                </Label>
                <div className="space-y-2">
                  {newField.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newField.options];
                          newOptions[index] = e.target.value;
                          setNewField({ ...newField, options: newOptions });
                        }}
                        placeholder="Enter option"
                        data-testid={`new-campaign-field-option-${index}`}
                        className="rounded-xl border border-input"
                      />
                      {newField.options.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newOptions = newField.options.filter((_, i) => i !== index);
                            setNewField({ ...newField, options: newOptions });
                          }}
                          className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewField({ ...newField, options: [...newField.options, ''] })}
                  data-testid="add-new-campaign-field-option"
                  className="rounded-xl border border-input"
                >
                  <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Add Option
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewFieldDialog(false);
                  setNewField({ field_name: '', display_label: '', options: [''] });
                }}
                className="rounded-xl border border-input"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateField}
                data-testid="submit-new-campaign-field"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/20"
              >
                Create Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Field confirmation */}
        <AlertDialog open={!!deleteField} onOpenChange={(open) => !open && setDeleteField(null)}>
          <AlertDialogContent className="rounded-2xl" data-testid="delete-field-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remove {deleteField?.display_label || deleteField?.field_name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this field? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" data-testid="cancel-delete-field">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteField}
                data-testid="confirm-delete-field"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Delete Field
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
