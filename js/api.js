// sistema_voluntariado/js/api.js
class APIService {
    constructor() {
        this.baseURL = 'api/';
        this.token = localStorage.getItem('sgv_token') || '';
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('sgv_token', token);
    }

    clearToken() {
        this.token = '';
        localStorage.removeItem('sgv_token');
    }

    async request(endpoint, method = 'GET', data = null) {
        const url = this.baseURL + endpoint;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options = {
            method,
            headers,
            credentials: 'same-origin'
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            // Verificar si la respuesta es JSON
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                result = { success: false, message: 'Respuesta no válida del servidor' };
            }

            // Manejar token expirado
            if (response.status === 401 && result.message === 'Token expirado') {
                this.clearToken();
                localStorage.removeItem('sgv_currentUser');
                window.location.reload();
                return { success: false, requiresLogin: true };
            }

            return {
                success: response.ok,
                status: response.status,
                data: result.data || result,
                message: result.message || ''
            };
        } catch (error) {
            console.error('Error en API request:', error);
            
            // Guardar operación para sincronización offline
            if (method === 'POST' || method === 'PUT') {
                this.guardarOperacionOffline(endpoint, method, data);
            }
            
            return {
                success: false,
                status: 0,
                data: null,
                message: 'Error de conexión. Trabajando en modo offline.',
                offline: true
            };
        }
    }

    guardarOperacionOffline(endpoint, method, data) {
        const pending = JSON.parse(localStorage.getItem('sgv_pending_sync') || '[]');
        
        pending.push({
            endpoint: this.baseURL + endpoint,
            method,
            data,
            timestamp: Date.now()
        });
        
        localStorage.setItem('sgv_pending_sync', JSON.stringify(pending));
        
        // Mostrar notificación
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Operación guardada para sincronizar luego', 'warning');
        }
    }

    // Métodos específicos para cada entidad
    async login(email, password) {
        return await this.request('auth.php?action=login', 'POST', { email, password });
    }

    async register(userData) {
        return await this.request('auth.php?action=register', 'POST', userData);
    }

    async getCampaigns(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`campaigns.php?action=getAll&${queryParams}`);
    }

    async createCampaign(campaignData) {
        return await this.request('campaigns.php?action=create', 'POST', campaignData);
    }

    async applyToCampaign(campaignId) {
        return await this.request('applications.php?action=apply', 'POST', { campania_id: campaignId });
    }

    async updateProfile(userData) {
        return await this.request('auth.php?action=updateProfile', 'PUT', userData);
    }

    async getNotifications() {
        return await this.request('notifications.php?action=getByUser');
    }

    async markNotificationAsRead(notificationId) {
        return await this.request('notifications.php?action=markAsRead', 'POST', { id: notificationId });
    }

    async getMessages(conversationId = null) {
        const endpoint = conversationId 
            ? `messages.php?action=getByConversation&conversation_id=${conversationId}`
            : 'messages.php?action=getConversations';
        return await this.request(endpoint);
    }

    async sendMessage(messageData) {
        return await this.request('messages.php?action=send', 'POST', messageData);
    }

    async submitRating(ratingData) {
        return await this.request('ratings.php?action=submit', 'POST', ratingData);
    }

    async generateReport(reportType, format = 'pdf', filters = {}) {
        const queryParams = new URLSearchParams({ ...filters, format }).toString();
        return await this.request(`reports.php?action=${reportType}&${queryParams}`);
    }
}

// Instancia global
const api = new APIService();

// Exportar para uso global
window.api = api;