import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Users } from 'lucide-react';

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const readOnly = !(user.role === 'administrator' || user.role === 'superuser');

  const [formData, setFormData] = useState({
    campaign_name: '',
    election_start_date: '',
    election_end_date: '',
    channel: '',
    marketing_contacts: [],
    article_url: '',
    campaign_products: [],
    custom_fields: {}
  });

  const [users, setUsers] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [customCampaignFields, setCustomCampaignFields] = useState([]);
  const [uptake, setUptake] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDropdownOptions();
    if (isEdit) {
      fetchCampaign();
      fetchUptake();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${id}`, { headers: getAuthHeaders() });
      setFormData({ ...response.data, custom_fields: response.data.custom_fields || {} });
    } catch (error) {
      toast.error('Failed to fetch campaign details');
    }
  };

  const fetchUptake = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${id}/uptake`, { headers: getAuthHeaders() });
      setUptake(response.data);
    } catch (error) {
      console.error('Failed to fetch uptake');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/search`, { headers: getAuthHeaders() });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      const response = await axios.get(`${API}/dropdown-configs`, { headers: getAuthHeaders() });
      const customFields = [];
      response.data.forEach(config => {
        if (config.field_name === 'campaign_channel') {
          setChannelOptions(config.options);
        } else if (config.field_name === 'campaign_products') {
          setProductOptions(config.options);
        } else if (config.is_custom && config.field_name.startsWith('campaign_')) {
          customFields.push(config);
        }
      });
      setCustomCampaignFields(customFields);
    } catch (error) {
      console.error('Failed to fetch dropdown options');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      campaign_name: formData.campaign_name,
      election_start_date: formData.election_start_date,
      election_end_date: formData.election_end_date,
      channel: formData.channel,
      marketing_contacts: formData.marketing_contacts,
      article_url: formData.article_url || '',
      campaign_products: formData.campaign_products,
    };
    try {
      if (isEdit) {
        await axios.put(`${API}/campaigns/${id}`, payload, { headers: getAuthHeaders() });
        toast.success('Campaign updated successfully');
      } else {
        await axios.post(`${API}/campaigns`, payload, { headers: getAuthHeaders() });
        toast.success('Campaign created successfully');
      }
      navigate('/campaigns');
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} campaign`);
    } finally {
      setLoading(false);
    }
  };

  const handleContactToggle = (userId) => {
    if (readOnly) return;
    setFormData(prev => ({
      ...prev,
      marketing_contacts: prev.marketing_contacts.includes(userId)
        ? prev.marketing_contacts.filter(id => id !== userId)
        : [...prev.marketing_contacts, userId]
    }));
  };

  const handleProductToggle = (product) => {
    if (readOnly) return;
    setFormData(prev => ({
      ...prev,
      campaign_products: prev.campaign_products.includes(product)
        ? prev.campaign_products.filter(p => p !== product)
        : [...prev.campaign_products, product]
    }));
  };

  const uptakeCards = uptake ? [
    { label: 'Opted In', value: uptake.opt_in, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Opted Out', value: uptake.opt_out, icon: XCircle, tint: 'bg-red-50 text-red-600' },
    { label: 'Not Elected', value: uptake.not_elected, icon: MinusCircle, tint: 'bg-slate-100 text-slate-500' },
    { label: 'Total Clients', value: uptake.total_clients, icon: Users, tint: 'bg-primary/10 text-primary' },
  ] : [];

  return (
    <Layout pageTitle="Campaign Management">
      <div className="max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/campaigns')}
          data-testid="back-button"
          className="mb-6 rounded-xl hover:bg-muted -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
          Back to Campaigns
        </Button>

        {isEdit && uptake && (
          <div className="glass-card rounded-2xl p-6 mb-6 animate-rise" data-testid="campaign-uptake">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">Client Uptake</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {uptakeCards.map(({ label, value, icon: Icon, tint }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-border p-4" data-testid={`uptake-${label.toLowerCase().replace(/\s/g, '-')}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
                    <p className="font-display text-2xl font-bold text-foreground mt-1 font-data">{value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tint}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-8 animate-rise">
          <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-foreground">
            {readOnly ? 'Campaign Details' : isEdit ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {readOnly ? 'Read-only view of this campaign.' : 'Global campaign — automatically applies to all clients.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="campaign_name" className="text-xs uppercase tracking-wider font-medium">Campaign Name *</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  data-testid="campaign-name-input"
                  required
                  disabled={readOnly}
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="election_start_date" className="text-xs uppercase tracking-wider font-medium">Election Start Date *</Label>
                <Input
                  id="election_start_date"
                  type="date"
                  value={formData.election_start_date}
                  onChange={(e) => setFormData({ ...formData, election_start_date: e.target.value })}
                  data-testid="start-date-input"
                  required
                  disabled={readOnly}
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="election_end_date" className="text-xs uppercase tracking-wider font-medium">Election End Date *</Label>
                <Input
                  id="election_end_date"
                  type="date"
                  value={formData.election_end_date}
                  onChange={(e) => setFormData({ ...formData, election_end_date: e.target.value })}
                  data-testid="end-date-input"
                  required
                  disabled={readOnly}
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel" className="text-xs uppercase tracking-wider font-medium">Channel *</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger data-testid="channel-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article_url" className="text-xs uppercase tracking-wider font-medium">Article URL</Label>
                <Input
                  id="article_url"
                  type="url"
                  value={formData.article_url}
                  onChange={(e) => setFormData({ ...formData, article_url: e.target.value })}
                  data-testid="article-url-input"
                  placeholder="https://..."
                  disabled={readOnly}
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>
            </div>

            {customCampaignFields.length > 0 && (
              <div className="border-t border-border pt-6 mt-6">
                <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">Additional Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customCampaignFields.map((field) => (
                    <div key={field.field_name} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-medium">{field.display_label}</Label>
                      <Select
                        value={formData.custom_fields?.[field.field_name] || ''}
                        onValueChange={(value) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [field.field_name]: value } })}
                        disabled={readOnly}
                      >
                        <SelectTrigger data-testid={`custom-${field.field_name}-select`} className="rounded-xl h-11 bg-white">
                          <SelectValue placeholder={`Select ${field.display_label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">Campaign Manager(s)</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-4 bg-white/60">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contact-${u.id}`}
                        checked={formData.marketing_contacts.includes(u.id)}
                        onCheckedChange={() => handleContactToggle(u.id)}
                        disabled={readOnly}
                        data-testid={`contact-checkbox-${u.id}`}
                      />
                      <label htmlFor={`contact-${u.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {u.full_name} ({u.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">Campaign Products *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productOptions.map((product) => (
                  <div key={product} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product}`}
                      checked={formData.campaign_products.includes(product)}
                      onCheckedChange={() => handleProductToggle(product)}
                      disabled={readOnly}
                      data-testid={`product-checkbox-${product}`}
                    />
                    <label htmlFor={`product-${product}`} className="text-sm font-medium leading-none cursor-pointer">
                      {product}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {!readOnly && (
              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
                  data-testid="cancel-button"
                  className="rounded-xl border border-input"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="submit-button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20"
                >
                  {loading ? 'Saving...' : isEdit ? 'Update Campaign' : 'Create Campaign'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}
