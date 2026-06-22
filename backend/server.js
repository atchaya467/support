import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import db from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to generate a unique ticket number
function generateTicketNumber() {
  const min = 100000;
  const max = 999999;
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return `AL-${num}`;
}

// In-memory store for pending 2FA registrations (email -> secret)
const pending2faStore = {};

// --- Google Authenticator Cryptographic Helpers (Zero-dependency) ---

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBuffer, counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTotp(secretBase32, token, window = 1) {
  try {
    const secretBuffer = base32Decode(secretBase32);
    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    for (let i = -window; i <= window; i++) {
      if (hotp(secretBuffer, currentCounter + i) === token.trim()) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error verifying TOTP:', e);
    return false;
  }
}

function generateSecret(length = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += alphabet[randomBytes[i] % alphabet.length];
  }
  return secret;
}

// --- User Registration: Create a new user account, then initiate 2FA ---
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const emailKey = trimmedEmail.toLowerCase();

  try {
    // Check if user already exists
    const [users] = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (users.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Insert user into DB
    await db.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [trimmedEmail, trimmedPassword]
    );

    // Immediately initiate 2FA Setup
    const secret = generateSecret(32);
    pending2faStore[emailKey] = secret;

    const otpauthUrl = `otpauth://totp/Support%20Center:${encodeURIComponent(trimmedEmail)}?secret=${secret}&issuer=Support%20Center`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    res.status(201).json({
      message: 'Account registered successfully. 2FA Setup Required.',
      mfaRequired: true,
      mfaSetup: true,
      email: trimmedEmail,
      secret,
      qrCodeUrl
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// --- User Login: Validate email + password, then prompt for 2FA ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email.trim(), password.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const emailKey = email.trim().toLowerCase();

    // Check if user has 2FA enabled
    const twoFactorEnabled = user.two_factor_enabled === 1 || user.two_factor_enabled === true;

    if (!twoFactorEnabled) {
      // Generate a new 2FA secret for registration setup
      const secret = generateSecret(32);
      pending2faStore[emailKey] = secret;

      const otpauthUrl = `otpauth://totp/Support%20Center:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Support%20Center`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

      return res.json({
        message: '2FA Setup Required. Scan the QR code to proceed.',
        mfaRequired: true,
        mfaSetup: true,
        email: user.email,
        secret,
        qrCodeUrl
      });
    }

    // User already has 2FA enabled
    res.json({
      message: '2FA Verification Required.',
      mfaRequired: true,
      mfaSetup: false,
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// --- Verify Google Authenticator Code to Complete Login ---
app.post('/api/verify-2fa', async (req, res) => {
  const { email, token, isSetup } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const emailKey = email.trim().toLowerCase();

  try {
    if (isSetup) {
      // Setup phase: check pending store
      const secret = pending2faStore[emailKey];
      if (!secret) {
        return res.status(400).json({ error: 'Session expired or 2FA not initiated. Please sign in again.' });
      }

      const isValid = verifyTotp(secret, token);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code. Please try again.' });
      }

      // Valid: save to DB and enable 2FA
      await db.query(
        'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE LOWER(email) = LOWER(?)',
        [secret, emailKey]
      );
      delete pending2faStore[emailKey];

      return res.json({
        message: '2FA Setup successful. Login complete.',
        email: emailKey
      });
    } else {
      // Normal verification phase: fetch from DB
      const [users] = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [emailKey]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const user = users[0];
      const secret = user.two_factor_secret;
      const isEnabled = user.two_factor_enabled === 1 || user.two_factor_enabled === true;

      if (!isEnabled || !secret) {
        return res.status(400).json({ error: 'Two-factor authentication is not enabled for this account.' });
      }

      const isValid = verifyTotp(secret, token);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code. Please try again.' });
      }

      return res.json({
        message: '2FA code verified successfully. Login complete.',
        email: emailKey
      });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Server error during 2FA verification.' });
  }
});

// --- Backward compatibility fallback for verify-otp ---
app.post('/api/verify-otp', async (req, res) => {
  // If anything calls verify-otp, route it to verify-2fa verification
  const { email, otp } = req.body;
  req.body.token = otp;
  req.body.isSetup = false;
  return app._router.handle(req, res); // Redirect to verify-2fa
});

// 1. Get all help topics (for form dropdown)
app.get('/api/help-topics', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM help_topics ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching help topics:', error);
    res.status(500).json({ error: 'Failed to retrieve help topics' });
  }
});

// 2. Submit a new support ticket (open.php replacement)
app.post('/api/tickets', async (req, res) => {
  const {
    name,
    email,
    phone,
    help_topic_id,
    subject,
    description,
    priority
  } = req.body;

  // Simple validation
  if (!name || !email || !phone || !help_topic_id || !subject || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const ticketNumber = generateTicketNumber();
    const finalPriority = priority || 'Low';

    const [result] = await db.query(
      `INSERT INTO tickets 
        (ticket_number, name, email, phone, help_topic_id, subject, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [ticketNumber, name, email, phone, help_topic_id, subject, description, finalPriority]
    );

    res.status(201).json({
      message: 'Ticket created successfully',
      ticketId: result.insertId,
      ticketNumber
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// 3. Track a ticket (requires matching email and ticket number)
app.get('/api/tickets/track', async (req, res) => {
  const { email, ticket_number } = req.query;

  if (!email || !ticket_number) {
    return res.status(400).json({ error: 'Email and ticket number are required' });
  }

  try {
    const [tickets] = await db.query(
      `SELECT t.*, ht.name AS help_topic_name 
       FROM tickets t
       JOIN help_topics ht ON t.help_topic_id = ht.id
       WHERE LOWER(t.email) = LOWER(?) AND t.ticket_number = ?`,
      [email.trim(), ticket_number.trim()]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'No ticket found with the matching details' });
    }

    res.json(tickets[0]);
  } catch (error) {
    console.error('Error tracking ticket:', error);
    res.status(500).json({ error: 'Server error tracking ticket' });
  }
});

// 4. Get all replies for a ticket
app.get('/api/tickets/:id/replies', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const [replies] = await db.query(
      'SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );
    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// 5. Post a new reply on a ticket
app.post('/api/tickets/:id/replies', async (req, res) => {
  const ticketId = req.params.id;
  const { sender, name, message } = req.body;

  if (!sender || !name || !message) {
    return res.status(400).json({ error: 'Sender, name, and message are required' });
  }

  try {
    // Check if ticket exists
    const [tickets] = await db.query('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const [result] = await db.query(
      'INSERT INTO ticket_replies (ticket_id, sender, name, message) VALUES (?, ?, ?, ?)',
      [ticketId, sender, name, message]
    );

    // Update ticket updated_at field
    await db.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [ticketId]);

    res.status(201).json({
      id: result.insertId,
      ticket_id: parseInt(ticketId),
      sender,
      name,
      message,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// 6. Staff Dashboard: List all tickets with filtering and search
app.get('/api/staff/tickets', async (req, res) => {
  const { status, priority, search } = req.query;

  let query = `
    SELECT t.*, ht.name AS help_topic_name
    FROM tickets t
    JOIN help_topics ht ON t.help_topic_id = ht.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (status) {
    query += ' AND t.status = ?';
    queryParams.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    queryParams.push(priority);
  }

  if (search) {
    query += ' AND (t.ticket_number LIKE ? OR t.name LIKE ? OR t.email LIKE ? OR t.subject LIKE ?)';
    const searchVal = `%${search}%`;
    queryParams.push(searchVal, searchVal, searchVal, searchVal);
  }

  query += ' ORDER BY t.created_at DESC';

  try {
    const [tickets] = await db.query(query, queryParams);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching staff tickets:', error);
    res.status(500).json({ error: 'Failed to query tickets' });
  }
});

// 7. Staff Dashboard: Update ticket status
app.put('/api/staff/tickets/:id/status', async (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing status value' });
  }

  try {
    const [result] = await db.query(
      'UPDATE tickets SET status = ? WHERE id = ?',
      [status, ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: `Ticket status successfully updated to ${status}` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
