# Nexus Events - Premium Event Booking System

Nexus Events is a full-stack, industry-standard event management and booking platform. It features a premium, responsive frontend built with Vanilla HTML/CSS/JS and a robust RESTful API backend built with Flask, SQLAlchemy, and JWT authentication.

## Features

* **Premium UI/UX**: Dark theme with glassmorphism effects, CSS grid layouts, smooth transitions, and responsive design.
* **Event Catalog**: Browse upcoming events with real-time search and category filtering.
* **Authentication**: Secure user registration and login using JWT (JSON Web Tokens).
* **Booking System**: Select ticket quantities, view dynamic availability, and book tickets.
* **Dev-Mode Checkout**: Fully functional local development mode that simulates Stripe checkout without requiring API keys.
* **User Dashboard**: View purchased tickets with beautiful, interactive ticket stubs (complete with mock QR codes).
* **Admin Dashboard**: Dedicated admin panel to create, edit, and delete events, as well as view all platform bookings and revenue statistics.
* **Toast Notifications**: Custom non-blocking alert system for user feedback.
* **Skeleton Loaders**: Shimmering placeholders during data fetches to improve perceived performance.

## Tech Stack

**Frontend:**
* HTML5 / CSS3 (CSS Variables, Flexbox, Grid)
* Vanilla JavaScript (ES6+, Fetch API)
* No external CSS/JS frameworks required

**Backend:**
* Python 3
* Flask (REST API routing)
* Flask-SQLAlchemy (ORM & SQLite Database)
* Flask-JWT-Extended (Authentication)
* Stripe Python SDK (Payment processing)

## Getting Started

### Prerequisites
* Python 3.8+
* A modern web browser
* A local web server (like VS Code Live Server or Python's `http.server`) to serve the frontend files.

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **(Optional but recommended) Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy the provided example file to create your own configuration.
   ```bash
   cp .env.example .env
   ```
   *Note: For local development, the default values in `.env.example` (or even without a `.env` file) will enable a "Dev Mode" that bypasses actual Stripe API calls so you can test the booking flow immediately.*

5. **Seed the Database:**
   Populate the SQLite database with initial events and users.
   ```bash
   python seed.py
   ```

6. **Start the Flask Server:**
   ```bash
   python app.py
   ```
   The backend API will run at `http://127.0.0.1:5000`.

### Frontend Setup

The frontend consists of static files that need to be served over HTTP (not the `file://` protocol) due to CORS and module requirements.

1. **Navigate to the project root** (where `index.html` is located).

2. **Start a local static server.** 
   Using Python:
   ```bash
   python -m http.server 5500
   ```
   *Or use the VS Code "Live Server" extension.*

3. **Open the app:**
   Navigate your browser to `http://127.0.0.1:5500`.

## Demo Credentials

The `seed.py` script automatically creates two accounts you can use to test the application:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@nexus.com` | `password123` | Can access Admin Dashboard, create/delete events |
| **User** | `jane@example.com` | `password123` | Standard user, can book tickets |

## Going to Production (Stripe Integration)

To enable real payments:
1. Obtain your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
2. Edit your `backend/.env` file and replace the mock key with your real Test Secret Key (`sk_test_...`).
3. The application will automatically detect the valid key format and route checkouts through Stripe's hosted payment pages.

## License
MIT License
