const API_BASE_URL = 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    localStorage.setItem('access_token', access);
    if (refresh) {
      this.refreshToken = refresh;
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    const headers = { ...options.headers };

    // Inject Bearer Token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const fetchOptions = {
      ...options,
      headers
    };

    try {
      let response = await fetch(url, fetchOptions);

      // Handle token expiration and attempt refresh
      if (response.status === 401 && this.refreshToken && path !== '/api/accounts/login/' && path !== '/api/token/refresh/') {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'An unknown error occurred.' };
        }
        throw { status: response.status, data: errorData };
      }

      return await response.json();
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw { status: 500, data: { message: error.message || 'Network error' } };
    }
  }

  async refreshTokens() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access, data.refresh);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (e) {
      this.clearTokens();
      return false;
    }
  }

  // Auth
  async login(email, password) {
    const res = await this.request('/api/accounts/login/', {
      method: 'POST',
      body: { email, password }
    });
    const data = res.data || res;
    if (data.access) {
      this.setTokens(data.access, data.refresh);
    }
    return res;
  }

  async register(username, email, password, phone = '') {
    return await this.request('/api/accounts/register/', {
      method: 'POST',
      body: { username, email, password, phone }
    });
  }

  async getProfile() {
    return await this.request('/api/accounts/profile/');
  }

  // Dashboard
  async getDashboard() {
    return await this.request('/api/dashboard/');
  }

  // Organizations
  async getOrganizations() {
    return await this.request('/api/organizations/');
  }

  async createOrganization(name) {
    return await this.request('/api/organizations/create/', {
      method: 'POST',
      body: { name }
    });
  }

  async getTeamMembers(orgId) {
    return await this.request(`/api/organizations/${orgId}/members/`);
  }

  async addTeamMember(orgId, email, role) {
    return await this.request('/api/organizations/members/add/', {
      method: 'POST',
      body: {
        organization_id: orgId,
        user_email: email,
        role: role
      }
    });
  }

  // Contacts
  async getContacts(search = '', page = 1) {
    let path = `/api/contacts/?page=${page}`;
    if (search) {
      path += `&search=${encodeURIComponent(search)}`;
    }
    return await this.request(path);
  }

  async createContact(contactData) {
    return await this.request('/api/contacts/create/', {
      method: 'POST',
      body: contactData
    });
  }

  async updateContact(id, contactData) {
    return await this.request(`/api/contacts/${id}/`, {
      method: 'PUT',
      body: contactData
    });
  }

  async deleteContact(id) {
    return await this.request(`/api/contacts/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  async bulkCreateContacts(contactsArray) {
    return await this.request('/api/contacts/bulk-create/', {
      method: 'POST',
      body: contactsArray
    });
  }

  // Leads
  async getLeads(status = '') {
    let path = '/api/leads/';
    if (status) {
      path += `?status=${status}`;
    }
    return await this.request(path);
  }

  async createLead(leadData) {
    return await this.request('/api/leads/create/', {
      method: 'POST',
      body: leadData
    });
  }

  async updateLead(id, leadData) {
    return await this.request(`/api/leads/${id}/`, {
      method: 'PATCH',
      body: leadData
    });
  }

  async deleteLead(id) {
    return await this.request(`/api/leads/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  async bulkUpdateLeads(leadsArray) {
    return await this.request('/api/leads/bulk-update/', {
      method: 'PATCH',
      body: leadsArray
    });
  }

  // Deals
  async getDeals() {
    return await this.request('/api/deals/');
  }

  async createDeal(dealData) {
    return await this.request('/api/deals/create/', {
      method: 'POST',
      body: dealData
    });
  }

  async updateDeal(id, dealData) {
    return await this.request(`/api/deals/${id}/update/`, {
      method: 'PATCH',
      body: dealData
    });
  }

  async deleteDeal(id) {
    return await this.request(`/api/deals/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  async convertLeadToDeal(leadId, title, value) {
    return await this.request('/api/deals/convert/', {
      method: 'POST',
      body: {
        lead_id: leadId,
        title,
        value
      }
    });
  }

  // Activities
  async getActivities() {
    return await this.request('/api/activities/');
  }

  async createActivity(activityData) {
    return await this.request('/api/activities/create/', {
      method: 'POST',
      body: activityData
    });
  }

  async updateActivity(id, activityData) {
    return await this.request(`/api/activities/${id}/`, {
      method: 'PATCH',
      body: activityData
    });
  }

  async deleteActivity(id) {
    return await this.request(`/api/activities/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  // Attachments
  async getAttachments(leadId) {
    return await this.request(`/api/attachments/lead/${leadId}/`);
  }

  async uploadAttachment(leadId, file) {
    const formData = new FormData();
    formData.append('lead', leadId);
    formData.append('file', file);

    return await this.request('/api/attachments/upload/', {
      method: 'POST',
      body: formData
    });
  }

  // Notifications
  async getNotifications() {
    return await this.request('/api/notifications/');
  }

  async readNotification(id) {
    return await this.request(`/api/notifications/${id}/read/`, {
      method: 'PATCH'
    });
  }

  async readAllNotifications() {
    return await this.request('/api/notifications/read-all/', {
      method: 'PATCH'
    });
  }

  async deleteNotification(id) {
    return await this.request(`/api/notifications/${id}/delete/`, {
      method: 'DELETE'
    });
  }

  // AI Assistant
  async aiChat(message) {
    return await this.request('/api/ai/chat/', {
      method: 'POST',
      body: { message }
    });
  }

  async generateEmail(leadId, goal) {
    return await this.request('/api/ai/email/', {
      method: 'POST',
      body: { lead_id: leadId, goal }
    });
  }

  async getLeadSummary(leadId) {
    return await this.request('/api/ai/lead-summary/', {
      method: 'POST',
      body: { lead_id: leadId }
    });
  }

  async getLeadScore(leadId) {
    return await this.request('/api/ai/score/', {
      method: 'POST',
      body: { lead_id: leadId }
    });
  }

  async convertMeetingNotes(meetingText) {
    return await this.request('/api/ai/meeting-notes/', {
      method: 'POST',
      body: { meeting_text: meetingText }
    });
  }

  // Password Management
  async forgotPassword(email) {
    return await this.request('/api/accounts/forgot-password/', {
      method: 'POST',
      body: { email }
    });
  }

  async resetPassword(uid, token, newPassword) {
    return await this.request('/api/accounts/reset-password/', {
      method: 'POST',
      body: { uid, token, new_password: newPassword }
    });
  }

  async changePassword(oldPassword, newPassword) {
    return await this.request('/api/accounts/change-password/', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword }
    });
  }
}

export const api = new ApiClient();
