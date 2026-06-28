/* =========================================================
   checkout.js — Event Detail & Booking Page Logic
   ========================================================= */

let currentEvent = null;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
    // Render nav (app.js provides renderNav, data.js provides getCurrentUser)
    renderNav();

    const params  = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    const canceled = params.get('canceled');

    if (canceled) {
        toast('Payment was cancelled — you have not been charged.', 'warning');
        // Clean URL
        window.history.replaceState({}, '', `event.html?id=${eventId}`);
    }

    if (!eventId) {
        window.location.href = 'index.html';
        return;
    }

    renderEventDetail(eventId);
});


// =========================================================
// EVENT DETAIL RENDER
// =========================================================
async function renderEventDetail(eventId) {
    const wrapper = document.getElementById('event-detail-wrapper');
    if (!wrapper) return;

    // Skeleton
    wrapper.innerHTML = `
        <div class="skeleton-card" style="height:420px; border-radius: var(--radius-lg); margin-bottom:2.5rem;"></div>
        <div style="display:grid; grid-template-columns:1fr 360px; gap:2.5rem;">
            <div>
                <div class="skeleton skeleton-line skeleton-line-full" style="height:28px; margin-bottom:1rem;"></div>
                <div class="skeleton skeleton-line" style="width:60%; margin-bottom:2rem;"></div>
                <div class="skeleton skeleton-line skeleton-line-full" style="margin-bottom:.5rem;"></div>
                <div class="skeleton skeleton-line skeleton-line-full" style="margin-bottom:.5rem;"></div>
                <div class="skeleton skeleton-line" style="width:80%;"></div>
            </div>
            <div class="booking-panel" style="height:350px;"></div>
        </div>
    `;

    const event = await getEvent(eventId);

    if (!event) {
        wrapper.innerHTML = `
            <div class="empty-state">
                <h2>Event Not Found</h2>
                <p style="margin:1rem 0 1.5rem;">This event doesn't exist or may have been removed.</p>
                <a href="index.html" class="btn btn-primary">Browse All Events</a>
            </div>
        `;
        return;
    }

    currentEvent = event;
    document.title = `${event.title} | Nexus Events`;

    const available  = event.availableTickets ?? (event.totalTickets - event.soldTickets);
    const isSoldOut  = available === 0;
    const pct        = event.totalTickets > 0 ? Math.round((event.soldTickets / event.totalTickets) * 100) : 0;
    const fillClass  = available === 0 ? 'sold' : available < (event.totalTickets * 0.1) ? 'low' : '';
    const user       = getCurrentUser();
    const maxQty     = Math.min(10, available);

    wrapper.innerHTML = `
        <div class="event-hero">
            <div class="event-hero-bg" style="background-image: url('${event.image || ''}')"></div>
            <div class="event-hero-overlay"></div>
            <div class="event-hero-content">
                ${categoryBadgeHTML(event.category)}
                <h1 style="margin-top:0.5rem;">${event.title}</h1>
            </div>
        </div>

        <div class="event-detail-content">
            <div class="event-main">
                <div class="event-info-grid">
                    <div class="event-info-item">
                        <div class="label">Date</div>
                        <div class="value">${formatDate(event.date)}</div>
                    </div>
                    <div class="event-info-item">
                        <div class="label">Time</div>
                        <div class="value">${event.time}</div>
                    </div>
                    <div class="event-info-item">
                        <div class="label">Location</div>
                        <div class="value">${event.location}</div>
                    </div>
                    <div class="event-info-item">
                        <div class="label">Price</div>
                        <div class="value" style="color:var(--success)">${formatCurrency(event.price)} / ticket</div>
                    </div>
                </div>

                <div class="event-detail-section">
                    <h3>About This Event</h3>
                    <p>${event.description || 'No description provided.'}</p>
                </div>
            </div>

            <div class="booking-panel" id="booking-panel">
                <h3>Book Tickets</h3>

                <div style="margin-bottom:1.25rem;">
                    <div class="price-row">
                        <span>General Admission</span>
                        <span style="font-weight:700; color:var(--success)">${formatCurrency(event.price)}</span>
                    </div>
                    <div class="availability-bar">
                        <div class="availability-fill ${fillClass}" style="width:${pct}%"></div>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        ${isSoldOut
                            ? '<span style="color:var(--danger)">Sold Out</span>'
                            : `${available} of ${event.totalTickets} tickets remaining`
                        }
                    </div>
                </div>

                ${!isSoldOut ? `
                    <div class="form-group">
                        <label>Quantity</label>
                        <select id="ticket-qty" class="form-input" onchange="updateTotal()">
                            ${Array.from({ length: maxQty }, (_, i) =>
                                `<option value="${i + 1}">${i + 1} ticket${i > 0 ? 's' : ''}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="total-row">
                        <span>Total</span>
                        <span id="display-total">${formatCurrency(event.price)}</span>
                    </div>

                    <div style="margin-top:1.5rem;">
                        ${user
                            ? `<button class="btn btn-primary btn-full btn-lg" id="checkout-btn" onclick="handleCheckout(this)">
                                <span class="btn-text">Proceed to Checkout</span>
                                <div class="loader btn-loader" style="display:none; border-color:rgba(255,255,255,0.3); border-top-color:#fff;"></div>
                               </button>`
                            : `<button class="btn btn-secondary btn-full btn-lg" onclick="openAuthModal('login')">
                                Log In to Book
                               </button>
                               <p style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin-top:0.75rem;">
                                Don't have an account? <a href="#" onclick="openAuthModal('register')" style="color:var(--primary-light)">Register free</a>
                               </p>`
                        }
                    </div>

                    <div style="margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--border-color);">
                        <div style="display:flex; gap:0.5rem; align-items:center; color:var(--text-muted); font-size:0.78rem; margin-bottom:0.4rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            Secured by Stripe
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center; color:var(--text-muted); font-size:0.78rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V10h16v8zm0-10H4V6h16v2z"/></svg>
                            Instant e-ticket delivery
                        </div>
                    </div>
                ` : `
                    <button class="btn btn-secondary btn-full btn-lg" disabled>Event Sold Out</button>
                    <p style="text-align:center; color:var(--text-muted); font-size:0.82rem; margin-top:1rem;">
                        Check back later or browse other events.
                    </p>
                `}
            </div>
        </div>
    `;
}


// =========================================================
// TICKET TOTAL UPDATE
// =========================================================
function updateTotal() {
    if (!currentEvent) return;
    const qty = parseInt(document.getElementById('ticket-qty')?.value || 1);
    selectedQuantity = qty;
    const totalEl = document.getElementById('display-total');
    if (totalEl) totalEl.textContent = formatCurrency(qty * currentEvent.price);
}


// =========================================================
// CHECKOUT HANDLER
// =========================================================
async function handleCheckout(btn) {
    setButtonLoading(btn, true);

    const qty = parseInt(document.getElementById('ticket-qty')?.value || 1);
    const res = await checkout(currentEvent.id, qty);

    if (!res.success) {
        toast(res.error || 'Checkout failed. Please try again.', 'error');
        setButtonLoading(btn, false);
    }
    // If success, page will redirect — no need to reset button
}
