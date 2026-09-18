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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [formData, setFormData] = useState({
    policy_id: '',
    client_name: '',
    platform: '',
    account_type: '',
    plan: '',
    client_status: '',
    client_managers: [],
    engagement_solutions_client: '',
    global_status_email: '',
    global_status_direct_mail: '',
    global_status_phone: '',
    global_status_direct_sms: '',
    custom_fields: {}
  });
  
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState({
    platform: [],
    account_type: [],
    plan: [],
    client_status: [],
    engagement_solutions_client: [],
    global_status: []
  });
  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    fetchDropdownOptions();
    if (isEdit) {
      fetchClient();
    }
    fetchUsers();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchUsers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDropdownOptions = async () => {
    try {
      const response = await axios.get(`${API}/dropdown-configs`, {
        headers: getAuthHeaders()
      });
      const options = {};
      const custom = [];
      response.data.forEach(config => {
        options[config.field_name] = config.options;
        // Only include custom fields that are NOT campaign fields
        if (config.is_custom && !config.field_name.startsWith('campaign_')) {
          custom.push(config);
        }
      });
      setDropdownOptions(options);
      setCustomFields(custom);
    } catch (error) {
      console.error('Failed to fetch dropdown options');
    }
  };

  const fetchClient = async () => {
    try {
      const response = await axios.get(`${API}/clients/${id}`, {
        headers: getAuthHeaders()
      });
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to fetch client details');
    }
  };

  const fetchUsers = async (query = '') => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API}/users/search`, {
        headers: getAuthHeaders(),
        params: { q: query }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await axios.put(`${API}/clients/${id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Client updated successfully');
      } else {
        await axios.post(`${API}/clients`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Client created successfully');
      }
      navigate('/clients');
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} client`);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      client_managers: prev.client_managers.includes(userId)
        ? prev.client_managers.filter(id => id !== userId)
        : [...prev.client_managers, userId]
    }));
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/clients')}
          data-testid="back-button"
          className="mb-6 rounded-xl hover:bg-muted -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
          Back to Clients
        </Button>

        <div className="glass-card rounded-2xl p-8 animate-rise">
          <h2 className="font-display text-2xl font-bold tracking-tight mb-6 text-foreground">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="policy_id" className="text-xs uppercase tracking-wider font-medium">
                  Policy ID *
                </Label>
                <Input
                  id="policy_id"
                  value={formData.policy_id}
                  onChange={(e) => setFormData({ ...formData, policy_id: e.target.value })}
                  data-testid="policy-id-input"
                  required
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name" className="text-xs uppercase tracking-wider font-medium">
                  Client Name *
                </Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  data-testid="client-name-input"
                  required
                  className="rounded-xl h-11 bg-white border border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform" className="text-xs uppercase tracking-wider font-medium">
                  Platform *
                </Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  required
                >
                  <SelectTrigger data-testid="platform-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.platform.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type" className="text-xs uppercase tracking-wider font-medium">
                  Account Type *
                </Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                  required
                >
                  <SelectTrigger data-testid="account-type-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.account_type.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan" className="text-xs uppercase tracking-wider font-medium">
                  Plan *
                </Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                  required
                >
                  <SelectTrigger data-testid="plan-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.plan.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_status" className="text-xs uppercase tracking-wider font-medium">
                  Client Status *
                </Label>
                <Select
                  value={formData.client_status}
                  onValueChange={(value) => setFormData({ ...formData, client_status: value })}
                  required
                >
                  <SelectTrigger data-testid="client-status-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.client_status.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engagement_solutions_client" className="text-xs uppercase tracking-wider font-medium">
                  Engagement Solutions Client *
                </Label>
                <Select
                  value={formData.engagement_solutions_client}
                  onValueChange={(value) => setFormData({ ...formData, engagement_solutions_client: value })}
                  required
                >
                  <SelectTrigger data-testid="engagement-solutions-select" className="rounded-xl h-11 bg-white">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.engagement_solutions_client.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Global Status Fields */}
            <div className="border-t border-border pt-6 mt-6">
              <h3 className="font-display text-lg font-semibold tracking-tight mb-4">Global Communication Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium">
                    Email *
                  </Label>
                  <Select
                    value={formData.global_status_email}
                    onValueChange={(value) => setFormData({ ...formData, global_status_email: value })}
                    required
                  >
                    <SelectTrigger data-testid="global-status-email-select" className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownOptions.global_status.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium">
                    Direct Mail *
                  </Label>
                  <Select
                    value={formData.global_status_direct_mail}
                    onValueChange={(value) => setFormData({ ...formData, global_status_direct_mail: value })}
                    required
                  >
                    <SelectTrigger data-testid="global-status-mail-select" className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownOptions.global_status.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium">
                    Phone *
                  </Label>
                  <Select
                    value={formData.global_status_phone}
                    onValueChange={(value) => setFormData({ ...formData, global_status_phone: value })}
                    required
                  >
                    <SelectTrigger data-testid="global-status-phone-select" className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownOptions.global_status.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium">
                    Direct SMS *
                  </Label>
                  <Select
                    value={formData.global_status_direct_sms}
                    onValueChange={(value) => setFormData({ ...formData, global_status_direct_sms: value })}
                    required
                  >
                    <SelectTrigger data-testid="global-status-sms-select" className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdownOptions.global_status.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="font-display text-lg font-semibold tracking-tight mb-4">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customFields.map((field) => (
                    <div key={field.field_name} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-medium">
                        {field.display_label}
                      </Label>
                      <Select
                        value={formData.custom_fields[field.field_name] || ''}
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

            {/* Client Managers */}
            <div className="border-t border-border pt-6 mt-6">
              <Label className="text-xs uppercase tracking-wider font-medium mb-3 block">
                Client Manager(s) *
              </Label>
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="manager-search-input"
                className="mb-4 rounded-xl h-11 bg-white border border-input"
              />
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-4 bg-white/60">
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found</p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`manager-${user.id}`}
                        checked={formData.client_managers.includes(user.id)}
                        onCheckedChange={() => handleManagerToggle(user.id)}
                        data-testid={`manager-checkbox-${user.id}`}
                      />
                      <label
                        htmlFor={`manager-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.full_name} ({user.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formData.client_managers.length === 0 && (
                <p className="text-xs text-destructive mt-2">At least one client manager is required</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clients')}
                data-testid="cancel-button"
                className="rounded-xl border border-input"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || formData.client_managers.length === 0}
                data-testid="submit-button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
