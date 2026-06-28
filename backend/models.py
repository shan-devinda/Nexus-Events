from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    bookings = db.relationship('Booking', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'isAdmin': self.is_admin,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }


class Event(db.Model):
    __tablename__ = 'event'

    id = db.Column(db.String(50), primary_key=True)   # evt-001 style
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='General')  # Conference, Festival, Workshop, etc.
    date = db.Column(db.String(50), nullable=False)   # YYYY-MM-DD
    time = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    image = db.Column(db.String(500))
    price = db.Column(db.Float, nullable=False)
    total_tickets = db.Column(db.Integer, nullable=False)
    sold_tickets = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'category': self.category,
            'date': self.date,
            'time': self.time,
            'location': self.location,
            'image': self.image,
            'price': self.price,
            'totalTickets': self.total_tickets,
            'soldTickets': self.sold_tickets,
            'description': self.description,
            'availableTickets': self.total_tickets - self.sold_tickets,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }


class Booking(db.Model):
    __tablename__ = 'booking'

    id = db.Column(db.String(50), primary_key=True)   # BKG-XXXXXXXXX
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    event_id = db.Column(db.String(50), db.ForeignKey('event.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_paid = db.Column(db.Float, nullable=False)
    stripe_session_id = db.Column(db.String(200), unique=True, nullable=True)  # Prevents duplicate bookings
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    event = db.relationship('Event', backref='bookings')

    def to_dict(self):
        return {
            'bookingId': self.id,
            'eventId': self.event_id,
            'eventTitle': self.event.title if self.event else 'Unknown',
            'eventDate': self.event.date if self.event else '',
            'eventImage': self.event.image if self.event else '',
            'eventCategory': self.event.category if self.event else '',
            'eventLocation': self.event.location if self.event else '',
            'quantity': self.quantity,
            'totalPaid': self.total_paid,
            'purchaser': self.user.to_dict() if self.user else {},
            'purchasedAt': self.purchased_at.isoformat() + 'Z' if self.purchased_at else None
        }
