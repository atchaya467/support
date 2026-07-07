import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'support.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        two_factor_secret TEXT DEFAULT NULL,
        two_factor_enabled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS help_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        help_topic_id INTEGER NOT NULL,
        priority TEXT DEFAULT 'Low',
        status TEXT DEFAULT 'Open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pending_2fa (
        email TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    
    # Seed help topics if empty
    cursor.execute("SELECT COUNT(*) FROM help_topics")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("INSERT INTO help_topics (id, name, description) VALUES (?, ?, ?)", [
            (1, 'Engine & Transmission', 'Issues related to engine performance, transmission, fuel system, or exhaust.'),
            (2, 'Electrical & Electronics', 'Issues with battery, wiring, instrument cluster, starter motor, alternator, or lights.'),
            (3, 'Chassis & Suspension', 'Issues regarding steering, brakes, suspension, axles, tires, or wheel alignment.'),
            (4, 'Warranty & AMC Claims', 'Queries regarding warranty coverages, claims, or Annual Maintenance Contracts (AMC).'),
            (5, 'General Inquiry / Feedback', 'Other questions, feedback about service center visits, or product suggestions.')
        ])
        
    # Seed default users if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("INSERT INTO users (email, password) VALUES (?, ?)", [
            ('admin@forte.com', 'admin123'),
            ('user@forte.com', 'user123'),
            ('demo@forte.com', 'demo123')
        ])
        
    conn.commit()
    conn.close()

init_db()
