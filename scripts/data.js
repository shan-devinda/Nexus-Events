/* =========================================================
   data.js — API Layer & Shared Utilities
   All API calls and shared helper functions live here.
   ========================================================= */

const API_BASE = 'http://127.0.0.1:5000/api';

// -------------------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------------------
function getAuthToken() {
    return localStorage.getItem('jwt_token');
}
function setAuthToken(token) {
    localStorage.setItem('jwt_token', token);
}
function clearAuthToken() {
    localStorage.removeItem('jwt_token');
}
function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function logout() {
    clearAuthToken();
    toast('You have been logged out.', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
}

async function loginUser(email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
            setAuthToken(data.access_token);
            return { success: true, user: data.user };
        }
        return { success: false, error: data.msg || 'Login failed' };
    } catch {
        return { success: false, error: 'Cannot connect to server. Is the backend running?' };
    }
}

async function registerUser(name, email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) return { success: true };
        return { success: false, error: data.msg || 'Registration failed' };
    } catch {
        return { success: false, error: 'Cannot connect to server. Is the backend running?' };
    }
}


// -------------------------------------------------------------------------
// EVENTS
// -------------------------------------------------------------------------
async function getEvents(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${API_BASE}/events?${query}` : `${API_BASE}/events`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('[getEvents]', err);
        return [];
    }
}

async function getEvent(id) {
    try {
        const res = await fetch(`${API_BASE}/events/${id}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error('[getEvent]', err);
        return null;
    }
}

async function getCategories() {
    try {
        const res = await fetch(`${API_BASE}/events/categories`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}


// -------------------------------------------------------------------------
// CHECKOUT
// -------------------------------------------------------------------------
async function checkout(eventId, quantity) {
    try {
        const res = await fetch(`${API_BASE}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ eventId, quantity })
        });
        const data = await res.json();
        if (res.ok && data.url) {
            if (data.devMode) {
                // Dev mode: booking already created, just redirect
                toast('Dev mode: Booking created instantly!', 'info');
                setTimeout(() => { window.location.href = data.url; }, 600);
                return { success: true };
            }
            window.location.href = data.url;
            return { success: true };
        }
        return { success: false, error: data.error || 'Failed to start checkout' };
    } catch {
        return { success: false, error: 'Cannot connect to server. Is the backend running?' };
    }
}


// -------------------------------------------------------------------------
// USER DASHBOARD
// -------------------------------------------------------------------------
async function getUserTickets() {
    try {
        const res = await fetch(`${API_BASE}/user/bookings`, {
            headers: getAuthHeaders()
        });
        if (res.status === 401) return { error: 'unauthorized' };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('[getUserTickets]', err);
        return { error: 'fetch_failed' };
    }
}


// -------------------------------------------------------------------------
// ADMIN API
// -------------------------------------------------------------------------
async function createEvent(eventData) {
    try {
        const res = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(eventData)
        });
        const data = await res.json();
        return { success: res.ok, data, error: data.msg };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

async function updateEvent(id, eventData) {
    try {
        const res = await fetch(`${API_BASE}/events/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(eventData)
        });
        const data = await res.json();
        return { success: res.ok, data, error: data.msg };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

async function deleteEvent(id) {
    try {
        const res = await fetch(`${API_BASE}/events/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        return { success: res.ok, error: data.msg };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

async function getAllBookings() {
    try {
        const res = await fetch(`${API_BASE}/admin/bookings`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('[getAllBookings]', err);
        return [];
    }
}


// -------------------------------------------------------------------------
// JWT HELPERS
// -------------------------------------------------------------------------
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;
    const payload = parseJwt(token);
    if (!payload) return null;
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearAuthToken();
        return null;
    }
    return payload;
}


// -------------------------------------------------------------------------
// DATE & CURRENCY FORMATTERS
// -------------------------------------------------------------------------
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getMonthShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });
}

function getDay(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' });
}

function isUpcoming(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr + 'T00:00:00') >= new Date(new Date().toDateString());
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}


// -------------------------------------------------------------------------
// TOAST NOTIFICATION SYSTEM
// -------------------------------------------------------------------------
(function initToastContainer() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createContainer);
    } else {
        createContainer();
    }
    function createContainer() {
        if (document.getElementById('toast-container')) return;
        const el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
    }
})();

const TOAST_ICONS = {
    success: '✓',
    error:   '✕',
    info:    'i',
    warning: '!'
};

function toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'alert');

    el.innerHTML = `
        <div class="toast-icon">${TOAST_ICONS[type] || 'i'}</div>
        <span class="toast-msg">${message}</span>
        <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

    const dismiss = () => {
        el.classList.remove('show');
        el.classList.add('hide');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    };

    el.querySelector('.toast-close').addEventListener('click', dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
    return dismiss;
}


// -------------------------------------------------------------------------
// CATEGORY BADGE HELPER
// -------------------------------------------------------------------------
function categoryBadgeClass(category) {
    const map = {
        'conference': 'badge-conference',
        'festival':   'badge-festival',
        'workshop':   'badge-workshop',
        'exhibition': 'badge-exhibition',
    };
    return map[(category || '').toLowerCase()] || 'badge-general';
}

function categoryBadgeHTML(category) {
    return `<span class="category-badge ${categoryBadgeClass(category)}">${category || 'General'}</span>`;
}
