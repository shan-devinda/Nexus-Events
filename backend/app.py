import os
import random
import string
import stripe
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Event, Booking, User

# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------
load_dotenv()

app = Flask(__name__)

# CORS: allow only the local dev frontend (adjust for production)
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "null"  # file:// origin used by some editors / direct open
]}})

# Database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///' + os.path.join(basedir, 'app.db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev-fallback-secret-CHANGE-IN-PROD')
jwt = JWTManager(app)

# Stripe
STRIPE_KEY = os.getenv('STRIPE_SECRET_KEY', '')
stripe.api_key = STRIPE_KEY
DEV_MODE = not STRIPE_KEY or STRIPE_KEY.startswith('sk_test_your')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5500')

db.init_app(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def generate_booking_id():
    chars = string.ascii_uppercase + string.digits
    return 'BKG-' + ''.join(random.choice(chars) for _ in range(9))


def admin_required(fn):
    """Decorator that requires a valid JWT AND admin role."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('is_admin'):
            return jsonify({"msg": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def validate_fields(data, required_fields):
    """Return a list of missing field names."""
    return [f for f in required_fields if not data.get(f) and data.get(f) != 0]


# ---------------------------------------------------------------------------
# Auth Routes
# ---------------------------------------------------------------------------
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    missing = validate_fields(data, ['name', 'email', 'password'])
    if missing:
        return jsonify({"msg": f"Missing fields: {', '.join(missing)}"}), 400

    name = data['name'].strip()
    email = data['email'].strip().lower()
    password = data['password']

    if len(password) < 6:
        return jsonify({"msg": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "An account with that email already exists"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "Account created successfully"}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({"msg": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "is_admin": user.is_admin,
            "email": user.email,
            "name": user.name
        }
    )
    return jsonify(access_token=access_token, user=user.to_dict())


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"msg": "User not found"}), 404
    return jsonify(user.to_dict())


# ---------------------------------------------------------------------------
# Public Event Routes
# ---------------------------------------------------------------------------
@app.route('/api/events', methods=['GET'])
def get_events():
    category = request.args.get('category')
    search = request.args.get('search', '').strip()

    query = Event.query
    if category and category.lower() != 'all':
        query = query.filter(Event.category.ilike(category))
    if search:
        query = query.filter(
            Event.title.ilike(f'%{search}%') |
            Event.description.ilike(f'%{search}%') |
            Event.location.ilike(f'%{search}%')
        )

    events = query.order_by(Event.date.asc()).all()
    return jsonify([e.to_dict() for e in events])


@app.route('/api/events/<event_id>', methods=['GET'])
def get_event(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"msg": "Event not found"}), 404
    return jsonify(event.to_dict())


@app.route('/api/events/categories', methods=['GET'])
def get_categories():
    """Return a list of distinct event categories."""
    rows = db.session.query(Event.category).distinct().all()
    return jsonify(sorted([r[0] for r in rows if r[0]]))


# ---------------------------------------------------------------------------
# Admin Event Routes
# ---------------------------------------------------------------------------
@app.route('/api/events', methods=['POST'])
@admin_required
def create_event():
    data = request.get_json(silent=True) or {}
    required = ['id', 'title', 'date', 'time', 'location', 'price', 'total_tickets']
    missing = validate_fields(data, required)
    if missing:
        return jsonify({"msg": f"Missing fields: {', '.join(missing)}"}), 400

    if Event.query.get(data['id']):
        return jsonify({"msg": f"Event with ID '{data['id']}' already exists"}), 409

    event = Event(
        id=data['id'].strip(),
        title=data['title'].strip(),
        category=data.get('category', 'General').strip(),
        date=data['date'],
        time=data['time'].strip(),
        location=data['location'].strip(),
        image=data.get('image', '').strip(),
        price=float(data['price']),
        total_tickets=int(data['total_tickets']),
        sold_tickets=int(data.get('sold_tickets', 0)),
        description=data.get('description', '').strip()
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201


@app.route('/api/events/<event_id>', methods=['PUT'])
@admin_required
def update_event(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"msg": "Event not found"}), 404

    data = request.get_json(silent=True) or {}
    protected = {'id', 'sold_tickets', 'created_at'}

    for key, value in data.items():
        if hasattr(event, key) and key not in protected:
            setattr(event, key, value)

    db.session.commit()
    return jsonify(event.to_dict())


@app.route('/api/events/<event_id>', methods=['DELETE'])
@admin_required
def delete_event(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({"msg": "Event not found"}), 404
    db.session.delete(event)
    db.session.commit()
    return jsonify({"msg": "Event deleted successfully"})


# ---------------------------------------------------------------------------
# Admin Bookings Overview
# ---------------------------------------------------------------------------
@app.route('/api/admin/bookings', methods=['GET'])
@admin_required
def get_all_bookings():
    bookings = Booking.query.order_by(Booking.purchased_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings])


# ---------------------------------------------------------------------------
# User Routes
# ---------------------------------------------------------------------------
@app.route('/api/user/bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    user_id = get_jwt_identity()
    bookings = Booking.query.filter_by(user_id=user_id)\
        .order_by(Booking.purchased_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings])


# ---------------------------------------------------------------------------
# Stripe Checkout
# ---------------------------------------------------------------------------
@app.route('/api/create-checkout-session', methods=['POST'])
@jwt_required()
def create_checkout_session():
    data = request.get_json(silent=True) or {}
    event_id = data.get('eventId')
    quantity = int(data.get('quantity', 1))

    if not event_id or quantity < 1:
        return jsonify({'error': 'Invalid request — eventId and quantity required'}), 400

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    available = event.total_tickets - event.sold_tickets
    if quantity > available:
        return jsonify({'error': f'Only {available} tickets available'}), 400

    user_id = get_jwt_identity()

    # ------------------------------------------------------------------
    # DEV MODE: If no valid Stripe key is configured, simulate a checkout
    # ------------------------------------------------------------------
    if DEV_MODE:
        # Create booking immediately without Stripe
        booking = Booking(
            id=generate_booking_id(),
            user_id=int(user_id),
            event_id=event.id,
            quantity=quantity,
            total_paid=round(event.price * quantity, 2),
            stripe_session_id=None
        )
        event.sold_tickets += quantity
        db.session.add(booking)
        db.session.commit()
        # Redirect to dashboard with booking ID so user sees the new ticket
        return jsonify({
            'url': f"{FRONTEND_URL}/dashboard.html?booking_id={booking.id}&dev=1",
            'devMode': True,
            'booking': booking.to_dict()
        })

    # ------------------------------------------------------------------
    # PRODUCTION: Real Stripe checkout
    # ------------------------------------------------------------------
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': event.title,
                        'description': event.description[:200] if event.description else '',
                        'images': [event.image] if event.image else [],
                    },
                    'unit_amount': int(event.price * 100),
                },
                'quantity': quantity,
            }],
            mode='payment',
            success_url=f"{FRONTEND_URL}/dashboard.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/event.html?id={event.id}&canceled=true",
            metadata={
                'event_id': event.id,
                'user_id': user_id,
                'quantity': str(quantity)
            }
        )
        return jsonify({'url': checkout_session.url})
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e.user_message)}), 400
    except Exception as e:
        return jsonify({'error': 'Checkout service unavailable'}), 500


@app.route('/api/complete-booking', methods=['POST'])
@jwt_required()
def complete_booking():
    """Called by frontend after Stripe success redirect to confirm and record the booking."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')

    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400

    # Prevent duplicate bookings from the same Stripe session
    existing = Booking.query.filter_by(stripe_session_id=session_id).first()
    if existing:
        return jsonify({'success': True, 'booking': existing.to_dict(), 'duplicate': True})

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Could not verify payment: {e.user_message}'}), 400

    if session.payment_status != 'paid':
        return jsonify({'error': 'Payment has not been completed'}), 400

    event_id = session.metadata.get('event_id')
    quantity = int(session.metadata.get('quantity', 1))
    user_id = get_jwt_identity()

    event = db.session.get(Event, event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    if event.sold_tickets + quantity > event.total_tickets:
        return jsonify({'error': 'Not enough tickets remaining — please contact support'}), 400

    booking = Booking(
        id=generate_booking_id(),
        user_id=int(user_id),
        event_id=event.id,
        quantity=quantity,
        total_paid=round(event.price * quantity, 2),
        stripe_session_id=session_id
    )
    event.sold_tickets += quantity
    db.session.add(booking)
    db.session.commit()

    return jsonify({'success': True, 'booking': booking.to_dict()})


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"msg": "Resource not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"msg": "Method not allowed"}), 405


@app.errorhandler(500)
def server_error(e):
    return jsonify({"msg": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    app.run(debug=debug, port=5000)
