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
import { ArrowLeft } from 'lucide-react';

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CampaignForm() {
  const { id, clientId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    client_id: clientId || '',
    election_start_date: '',
    election_end_date: '',
    channel: '',
    marketing_contacts: [],
    article_url: '',
    campaign_products: [],
    custom_fields: {}
  });
  
  const [client, setClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [customCampaignFields, setCustomCampaignFields] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
    fetchUsers();
    fetchDropdownOptions();
    if (isEdit) {
      fetchCampaign();
    }
  }, [id, clientId]);

  const fetchCampaign = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${id}`, {
        headers: getAuthHeaders()
      });
      setFormData(response.data);
      // Fetch client info for this campaign
      if (response.data.client_id) {
        const clientResponse = await axios.get(`${API}/clients/${response.data.client_id}`, {
          headers: getAuthHeaders()
        });
        setClient(clientResponse.data);
      }
    } catch (error) {
      toast.error('Failed to fetch campaign details');
    }
  };

  const fetchClient = async () => {
    try {
      const response = await axios.get(`${API}/clients/${clientId}`, {
        headers: getAuthHeaders()
      });
      setClient(response.data);
    } catch (error) {
      console.error('Failed to fetch client');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/search`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      const response = await axios.get(`${API}/dropdown-configs`, {
        headers: getAuthHeaders()
      });
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

    try {
      if (isEdit) {
        await axios.put(`${API}/campaigns/${id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Campaign updated successfully');
      } else {
        await axios.post(`${API}/campaigns`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Campaign created successfully');
      }
      navigate(`/clients/${formData.client_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} campaign`);
    } finally {
      setLoading(false);
    }
  };

  const handleContactToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      marketing_contacts: prev.marketing_contacts.includes(userId)
        ? prev.marketing_contacts.filter(id => id !== userId)
        : [...prev.marketing_contacts, userId]
    }));
  };

  const handleProductToggle = (product) => {
    setFormData(prev => ({
      ...prev,
      campaign_products: prev.campaign_products.includes(product)
        ? prev.campaign_products.filter(p => p !== product)
        : [...prev.campaign_products, product]
    }));
  };

  return (
    <Layout pageTitle="Campaign Management">
      <div className="max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(clientId ? `/clients/${clientId}` : '/campaigns')}
          data-testid="back-button"
          className="mb-6 rounded-xl hover:bg-muted -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
          Back to {clientId ? 'Client' : 'Campaigns'}
        </Button>

        <div className="glass-card rounded-2xl p-8 animate-rise">
          <h2 className="font-display text-2xl font-bold tracking-tight mb-6 text-foreground">
            {isEdit ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>

          {client && (
            <div className="mb-6 p-4 bg-primary/[0.04] border border-primary/15 rounded-xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(client.client_name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Client</Label>
                <p className="text-base font-semibold text-foreground">{client.client_name}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="campaign_name" className="text-xs uppercase tracking-wider font-medium">
                  Campaign Name *
                </Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  data-testid="campaign-name-input"
                  required
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="election_start_date" className="text-xs uppercase tracking-wider font-medium">
                  Election Start Date *
                </Label>
                <Input
                  id="election_start_date"
                  type="date"
                  value={formData.election_start_date}
                  onChange={(e) => setFormData({ ...formData, election_start_date: e.target.value })}
                  data-testid="start-date-input"
                  required
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="election_end_date" className="text-xs uppercase tracking-wider font-medium">
                  Election End Date *
                </Label>
                <Input
                  id="election_end_date"
                  type="date"
                  value={formData.election_end_date}
                  onChange={(e) => setFormData({ ...formData, election_end_date: e.target.value })}
                  data-testid="end-date-input"
                  required
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel" className="text-xs uppercase tracking-wider font-medium">
                  Channel *
                </Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  required
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
                <Label htmlFor="article_url" className="text-xs uppercase tracking-wider font-medium">
                  Article URL
                </Label>
                <Input
                  id="article_url"
                  type="url"
                  value={formData.article_url}
                  onChange={(e) => setFormData({ ...formData, article_url: e.target.value })}
                  data-testid="article-url-input"
                  placeholder="https://..."
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>
            </div>

            {/* Custom Campaign Fields */}
            {customCampaignFields.length > 0 && (
              <div className="border-t border-border pt-6 mt-6">
                <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">
                  Additional Information
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customCampaignFields.map((field) => (
                    <div key={field.field_name} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-medium">
                        {field.display_label}
                      </Label>
                      <Select
                        value={formData.custom_fields?.[field.field_name] || ''}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          custom_fields: { ...formData.custom_fields, [field.field_name]: value }
                        })}
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
              <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">
                Marketing Contact(s) *
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-4 bg-white/60">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found</p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contact-${user.id}`}
                        checked={formData.marketing_contacts.includes(user.id)}
                        onCheckedChange={() => handleContactToggle(user.id)}
                        data-testid={`contact-checkbox-${user.id}`}
                      />
                      <label
                        htmlFor={`contact-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.full_name} ({user.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">
                Campaign Products *
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productOptions.map((product) => (
                  <div key={product} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product}`}
                      checked={formData.campaign_products.includes(product)}
                      onCheckedChange={() => handleProductToggle(product)}
                      data-testid={`product-checkbox-${product}`}
                    />
                    <label
                      htmlFor={`product-${product}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {product}
                    </label>
                  </div>
                ))}
              </div>
            </div>

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
          </form>
        </div>
      </div>
    </Layout>
  );
}
