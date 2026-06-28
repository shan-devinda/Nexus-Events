/* =========================================================
   app.js — Catalog Page Logic & Shared Nav
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('index.html') || path === '/') {
        initCatalogPage();
    }
});


// =========================================================
// NAVIGATION
// =========================================================
function renderNav() {
    const user = getCurrentUser();
    const navRight = document.getElementById('nav-right');
    if (!navRight) return;

    navRight.innerHTML = '';

    if (user) {
        if (user.is_admin) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'btn btn-secondary btn-sm';
            adminLink.style.color = 'var(--primary-light)';
            adminLink.textContent = 'Admin';
            navRight.appendChild(adminLink);
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'nav-user-name';
        nameEl.textContent = user.name;
        navRight.appendChild(nameEl);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-secondary btn-sm';
        logoutBtn.textContent = 'Log out';
        logoutBtn.onclick = logout;
        navRight.appendChild(logoutBtn);
    } else {
        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-primary btn-sm';
        loginBtn.id = 'nav-login-btn';
        loginBtn.textContent = 'Log In';
        loginBtn.onclick = () => openAuthModal('login');
        navRight.appendChild(loginBtn);
    }
}


// =========================================================
// AUTH MODAL
// =========================================================
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('active');
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.auth-form-panel').forEach(p => {
        p.style.display = p.dataset.panel === tab ? 'block' : 'none';
    });
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('auth-modal');
    if (modal && e.target === modal) closeAuthModal();
});

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;

    setButtonLoading(btn, true);
    const res = await loginUser(email, pass);
    setButtonLoading(btn, false);

    if (res.success) {
        closeAuthModal();
        toast(`Welcome back, ${res.user?.name || 'User'}!`, 'success');
        setTimeout(() => renderNav(), 100);
    } else {
        toast(res.error, 'error');
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    const btn  = e.target.querySelector('button[type="submit"]');
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-pass').value;

    if (pass.length < 6) {
        toast('Password must be at least 6 characters', 'warning');
        return;
    }

    setButtonLoading(btn, true);
    const res = await registerUser(name, email, pass);

    if (res.success) {
        const loginRes = await loginUser(email, pass);
        setButtonLoading(btn, false);
        if (loginRes.success) {
            closeAuthModal();
            toast(`Account created! Welcome, ${name}!`, 'success');
            setTimeout(() => renderNav(), 100);
        }
    } else {
        setButtonLoading(btn, false);
        toast(res.error, 'error');
    }
}


// =========================================================
// CATALOG PAGE
// =========================================================
let allEvents = [];
let activeCategory = 'all';
let searchQuery = '';

async function initCatalogPage() {
    renderSkeletonCards();

    const [events, categories] = await Promise.all([
        getEvents(),
        getCategories()
    ]);

    allEvents = events;
    renderFilterTabs(categories);
    renderEvents(allEvents);
    setupSearch();
}

function renderSkeletonCards(count = 6) {
    const container = document.getElementById('events-container');
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-line skeleton-line-lg"></div>
                <div class="skeleton skeleton-line skeleton-line-md" style="margin-top: 0.5rem;"></div>
                <div class="skeleton skeleton-line skeleton-line-sm" style="margin-top: 0.5rem;"></div>
                <div class="skeleton skeleton-line skeleton-line-full" style="margin-top: 1.5rem; height: 40px; border-radius: 8px;"></div>
            </div>
        </div>
    `).join('');
}

function renderFilterTabs(categories) {
    const container = document.getElementById('filter-tabs');
    if (!container) return;

    const all = ['All', ...categories];
    container.innerHTML = all.map(cat => `
        <button
            class="filter-tab ${cat.toLowerCase() === 'all' ? 'active' : ''}"
            data-category="${cat.toLowerCase()}"
        >${cat}</button>
    `).join('');

    container.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            applyFilters();
        });
    });
}

function setupSearch() {
    const input = document.getElementById('catalog-search');
    if (!input) return;
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = input.value.trim().toLowerCase();
            applyFilters();
        }, 250);
    });
}

function applyFilters() {
    let filtered = allEvents;

    if (activeCategory !== 'all') {
        filtered = filtered.filter(e => (e.category || '').toLowerCase() === activeCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(e =>
            e.title.toLowerCase().includes(searchQuery) ||
            (e.location || '').toLowerCase().includes(searchQuery) ||
            (e.description || '').toLowerCase().includes(searchQuery)
        );
    }

    renderEvents(filtered);
}

function renderEvents(events) {
    const container = document.getElementById('events-container');
    const countEl   = document.getElementById('results-count');
    if (!container) return;

    if (countEl) {
        countEl.textContent = events.length === 1
            ? '1 event found'
            : `${events.length} events found`;
    }

    if (events.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No events found</h3>
                <p style="margin-top: 0.5rem;">Try adjusting your search or filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    events.forEach(event => {
        const available = event.availableTickets ?? (event.totalTickets - event.soldTickets);
        const pct = event.totalTickets > 0 ? (event.soldTickets / event.totalTickets) * 100 : 0;
        const statusText  = available === 0 ? 'Sold Out' : available < 20 ? `Only ${available} left!` : `${available} tickets left`;
        const statusClass = available === 0 ? 'sold' : available < (event.totalTickets * 0.1) ? 'low' : '';
        const isSoldOut   = available === 0;

        const card = document.createElement('div');
        card.className = 'event-card';

        card.innerHTML = `
            <div class="event-image" style="background-image: url('${event.image || ''}')">
                <div class="event-image-overlay"></div>
                <div class="event-date-badge">
                    <span class="month">${getMonthShort(event.date)}</span>
                    <span class="day">${getDay(event.date)}</span>
                </div>
                <div class="event-card-badge">${categoryBadgeHTML(event.category)}</div>
            </div>
            <div class="event-content">
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    ${event.location}
                </div>
                <div class="event-meta">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                    ${event.time}
                </div>
                <div class="event-footer">
                    <div class="event-price">${formatCurrency(event.price)}</div>
                    <div class="ticket-status ${statusClass}">${statusText}</div>
                </div>
                <a href="event.html?id=${event.id}" class="btn btn-primary btn-book">
                    ${isSoldOut ? 'Join Waitlist' : 'Book Now'}
                </a>
            </div>
        `;

        container.appendChild(card);
    });
}


// =========================================================
// BUTTON LOADING STATE
// =========================================================
function setButtonLoading(btn, loading) {
    if (!btn) return;
    const textEl   = btn.querySelector('.btn-text') || btn;
    const loaderEl = btn.querySelector('.btn-loader');

    if (loading) {
        btn.disabled = true;
        if (loaderEl) { loaderEl.style.display = 'inline-block'; }
        if (textEl !== btn) { textEl.style.opacity = '0'; }
    } else {
        btn.disabled = false;
        if (loaderEl) { loaderEl.style.display = 'none'; }
        if (textEl !== btn) { textEl.style.opacity = '1'; }
    }
}
