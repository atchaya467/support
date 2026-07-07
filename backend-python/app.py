from flask import Flask, request, jsonify
import urllib.parse
import random
from db import get_db_connection
import totp

app = Flask(__name__)

# Handle preflight OPTIONS requests for all endpoints
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return '', 200

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

def dict_from_row(row):
    return dict(row) if row else None

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Please provide a valid email address.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', (email,))
        if cursor.fetchone():
            return jsonify({'error': 'An account with this email address already exists.'}), 400

        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
        conn.commit()

        secret = totp.generate_secret()
        cursor.execute('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)', (email,))
        cursor.execute('INSERT INTO pending_2fa (email, secret) VALUES (?, ?)', (email, secret))
        conn.commit()

        otpauth_url = f"otpauth://totp/Support%20Center:{urllib.parse.quote(email)}?secret={secret}&issuer=Support%20Center"
        qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={urllib.parse.quote(otpauth_url)}"

        return jsonify({
            'message': 'Account registered successfully. 2FA Setup Required.',
            'mfaRequired': True,
            'mfaSetup': True,
            'email': email,
            'secret': secret,
            'qrCodeUrl': qr_code_url
        }), 201
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', (email,))
        row = cursor.fetchone()
        user = dict_from_row(row)

        if not user:
            # Auto register
            cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
            conn.commit()
            
            cursor.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', (email,))
            user = dict_from_row(cursor.fetchone())
        else:
            if user['password'] != password:
                return jsonify({'error': 'Invalid email or password.'}), 401

        two_factor_enabled = bool(user['two_factor_enabled'])

        if not two_factor_enabled:
            secret = totp.generate_secret()
            cursor.execute('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)', (email,))
            cursor.execute('INSERT INTO pending_2fa (email, secret) VALUES (?, ?)', (email, secret))
            conn.commit()

            otpauth_url = f"otpauth://totp/Support%20Center:{urllib.parse.quote(user['email'])}?secret={secret}&issuer=Support%20Center"
            qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={urllib.parse.quote(otpauth_url)}"

            return jsonify({
                'message': '2FA Setup Required. Scan the QR code to proceed.',
                'mfaRequired': True,
                'mfaSetup': True,
                'email': user['email'],
                'secret': secret,
                'qrCodeUrl': qr_code_url
            })
        else:
            return jsonify({
                'message': '2FA Verification Required.',
                'mfaRequired': True,
                'mfaSetup': False,
                'email': user['email']
            })
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/verify-2fa', methods=['POST'])
def verify_2fa():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    token = data.get('token', '').strip()
    is_setup = bool(data.get('isSetup', False))

    if not email or not token:
        return jsonify({'error': 'Email and verification code are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if is_setup:
            cursor.execute('SELECT secret FROM pending_2fa WHERE LOWER(email) = LOWER(?)', (email,))
            row = cursor.fetchone()
            secret = row['secret'] if row else None

            if not secret:
                return jsonify({'error': 'Session expired or 2FA not initiated. Please sign in again.'}), 400

            if not totp.verify_totp(secret, token):
                return jsonify({'error': 'Invalid verification code. Please try again.'}), 401

            cursor.execute('UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE LOWER(email) = LOWER(?)', (secret, email))
            cursor.execute('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)', (email,))
            conn.commit()

            return jsonify({
                'message': '2FA Setup successful. Login complete.',
                'email': email
            })
        else:
            cursor.execute('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', (email,))
            user = dict_from_row(cursor.fetchone())

            if not user:
                return jsonify({'error': 'User not found.'}), 404

            secret = user['two_factor_secret']
            enabled = bool(user['two_factor_enabled'])

            if not enabled or not secret:
                return jsonify({'error': 'Two-factor authentication is not enabled for this account.'}), 400

            if not totp.verify_totp(secret, token):
                return jsonify({'error': 'Invalid verification code. Please try again.'}), 401

            return jsonify({
                'message': '2FA code verified successfully. Login complete.',
                'email': email
            })
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/help-topics', methods=['GET'])
def help_topics():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM help_topics ORDER BY name ASC')
        rows = cursor.fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    help_topic_id = data.get('help_topic_id', '').strip()
    priority = data.get('priority', 'Low').strip()

    if not name or not email or not phone or not help_topic_id:
        return jsonify({'error': 'Name, email, phone and help topic are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        ticket_number = f"AL-{random.randint(100000, 999999)}"
        cursor.execute("""
            INSERT INTO tickets (ticket_number, name, email, phone, help_topic_id, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Open')
        """, (ticket_number, name, email, phone, help_topic_id, priority))
        conn.commit()
        ticket_id = cursor.lastrowid

        return jsonify({
            'message': 'Ticket created successfully',
            'ticketId': ticket_id,
            'ticketNumber': ticket_number
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets/track', methods=['GET'])
def track_ticket():
    email = request.args.get('email', '').strip()
    ticket_number = request.args.get('ticket_number', '').strip()

    if not email or not ticket_number:
        return jsonify({'error': 'Email and ticket number are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT t.*, ht.name AS help_topic_name
            FROM tickets t
            JOIN help_topics ht ON t.help_topic_id = ht.id
            WHERE LOWER(t.email) = LOWER(?) AND t.ticket_number = ?
        """, (email, ticket_number))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'No ticket found with matching details.'}), 404
        return jsonify(dict(row))
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets/<int:ticket_id>/replies', methods=['GET', 'POST'])
def ticket_replies(ticket_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'GET':
            cursor.execute('SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC', (ticket_id,))
            rows = cursor.fetchall()
            return jsonify([dict(r) for r in rows])
        
        elif request.method == 'POST':
            data = request.get_json() or {}
            sender = data.get('sender', '').strip()
            name = data.get('name', '').strip()
            message = data.get('message', '').strip()

            if not sender or not name or not message:
                return jsonify({'error': 'Sender, name, and message are required.'}), 400

            # Check ticket exists
            cursor.execute('SELECT id FROM tickets WHERE id = ?', (ticket_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Ticket not found.'}), 404

            cursor.execute('INSERT INTO ticket_replies (ticket_id, sender, name, message) VALUES (?, ?, ?, ?)',
                           (ticket_id, sender, name, message))
            reply_id = cursor.lastrowid
            
            import datetime
            now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('UPDATE tickets SET updated_at = ? WHERE id = ?', (now_str, ticket_id))
            conn.commit()

            return jsonify({
                'id': reply_id,
                'ticket_id': ticket_id,
                'sender': sender,
                'name': name,
                'message': message,
                'created_at': now_str
            }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/staff/tickets', methods=['GET'])
def staff_tickets():
    status = request.args.get('status', '')
    priority = request.args.get('priority', '')
    search = request.args.get('search', '')
    email = request.args.get('email', '')

    query = """
        SELECT t.*, ht.name AS help_topic_name
        FROM tickets t
        JOIN help_topics ht ON t.help_topic_id = ht.id
        WHERE 1=1
    """
    params = []

    if email:
        query += ' AND LOWER(t.email) = LOWER(?)'
        params.append(email)
    if status:
        query += ' AND t.status = ?'
        params.append(status)
    if priority:
        query += ' AND t.priority = ?'
        params.append(priority)
    if search:
        query += ' AND (t.ticket_number LIKE ? OR t.name LIKE ? OR t.email LIKE ?)'
        search_val = f"%{search}%"
        params.extend([search_val, search_val, search_val])

    query += ' ORDER BY t.created_at DESC'

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/staff/tickets/<int:ticket_id>/status', methods=['PUT'])
def update_ticket_status(ticket_id):
    data = request.get_json() or {}
    status = data.get('status', '').strip()
    valid_statuses = ['Open', 'In Progress', 'Resolved', 'Closed']

    if not status or status not in valid_statuses:
        return jsonify({'error': 'Invalid or missing status value.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('UPDATE tickets SET status = ? WHERE id = ?', (status, ticket_id))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Ticket not found.'}), 404

        return jsonify({'message': f'Ticket status successfully updated to {status}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
