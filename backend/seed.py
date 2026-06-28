from app import app, db
from models import Event, User
from werkzeug.security import generate_password_hash

INITIAL_EVENTS = [
    {
        'id': 'evt-001',
        'title': 'Future Tech Summit 2026',
        'category': 'Conference',
        'date': '2026-08-15',
        'time': '09:00 AM',
        'location': 'Moscone Center, San Francisco',
        'image': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 299.00,
        'total_tickets': 500,
        'sold_tickets': 450,
        'description': 'Join the brightest minds in technology for a 3-day summit covering artificial intelligence, quantum computing, and the future of the web. Network with 500+ industry leaders and attend 40+ keynote sessions.'
    },
    {
        'id': 'evt-002',
        'title': 'Neon Nights Music Festival',
        'category': 'Festival',
        'date': '2026-09-22',
        'time': '04:00 PM',
        'location': 'Downtown LA Warehouse District, Los Angeles',
        'image': 'https://images.unsplash.com/photo-1470229722913-7c090be5c5a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 149.00,
        'total_tickets': 2000,
        'sold_tickets': 1980,
        'description': 'An immersive audio-visual experience featuring top electronic artists, cutting-edge stage designs, and interactive art installations across three stages. A 12-hour journey through sound and light.'
    },
    {
        'id': 'evt-003',
        'title': 'Global Design Conference',
        'category': 'Conference',
        'date': '2026-10-05',
        'time': '10:00 AM',
        'location': 'ExCeL London, United Kingdom',
        'image': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 199.00,
        'total_tickets': 800,
        'sold_tickets': 200,
        'description': 'Explore the intersection of design, technology, and human culture. Learn from industry leaders how to create compelling, accessible user experiences that matter. 30 workshops over 2 days.'
    },
    {
        'id': 'evt-004',
        'title': 'AI & Machine Learning Workshop',
        'category': 'Workshop',
        'date': '2026-11-10',
        'time': '09:00 AM',
        'location': 'Innovation Hub, Austin, Texas',
        'image': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 399.00,
        'total_tickets': 100,
        'sold_tickets': 40,
        'description': 'A hands-on, intensive 2-day workshop covering modern ML workflows, LLM fine-tuning, and real-world AI deployment strategies. All skill levels welcome. Includes cloud GPU access.'
    },
    {
        'id': 'evt-005',
        'title': 'Modern Art Exhibition: Digital Frontiers',
        'category': 'Exhibition',
        'date': '2026-12-01',
        'time': '11:00 AM',
        'location': 'Contemporary Art Museum, New York',
        'image': 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 45.00,
        'total_tickets': 300,
        'sold_tickets': 50,
        'description': 'A groundbreaking exhibition showcasing works at the intersection of traditional artistry and digital innovation. Featuring 60 artists from 25 countries, interactive installations, and live digital creation sessions.'
    },
    {
        'id': 'evt-006',
        'title': 'Startup Founders Summit',
        'category': 'Conference',
        'date': '2026-07-20',
        'time': '08:30 AM',
        'location': 'Silicon Valley Convention Center, San Jose',
        'image': 'https://images.unsplash.com/photo-1559223607-a43c990c692c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        'price': 499.00,
        'total_tickets': 250,
        'sold_tickets': 180,
        'description': 'The premier gathering for startup founders and early-stage investors. Pitch competitions, VC office hours, product demos, and panels from founders who have scaled from zero to billion-dollar companies.'
    }
]

with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Creating all tables...")
    db.create_all()

    print("Seeding events...")
    for data in INITIAL_EVENTS:
        event = Event(**data)
        db.session.add(event)

    print("Creating admin user...")
    admin = User(
        name="Admin User",
        email="admin@nexus.com",
        password_hash=generate_password_hash("password123"),
        is_admin=True
    )
    db.session.add(admin)

    print("Creating test user...")
    user = User(
        name="Jane Smith",
        email="jane@example.com",
        password_hash=generate_password_hash("password123"),
        is_admin=False
    )
    db.session.add(user)

    db.session.commit()
    print("\nDatabase seeded successfully!")
    print("   Admin:     admin@nexus.com  / password123")
    print("   Test User: jane@example.com / password123")
    print(f"   Events:    {len(INITIAL_EVENTS)} events created")
