import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
