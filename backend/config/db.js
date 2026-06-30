import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let dbObject;

// 1. Set up standard connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'support',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Test connection and set up fallback mock DB if MySQL is offline
try {
  const connection = await pool.getConnection();
  console.log('Successfully connected to MySQL database.');
  connection.release();
  dbObject = pool;
} catch (error) {
  console.warn('\n======================================================');
  console.warn('WARNING: Could not connect to local MySQL database.');
  console.warn('Error detail:', error.message);
  console.warn('---> Falling back to IN-MEMORY Mock Database for testing.');
  console.warn('======================================================\n');

  // Seed initial help topics
  const mockHelpTopics = [
    { id: 1, name: 'Engine & Transmission', description: 'Issues related to engine performance, transmission, fuel system, or exhaust.' },
    { id: 2, name: 'Electrical & Electronics', description: 'Issues with battery, wiring, instrument cluster, starter motor, alternator, or lights.' },
    { id: 3, name: 'Chassis & Suspension', description: 'Issues regarding steering, brakes, suspension, axles, tires, or wheel alignment.' },
    { id: 4, name: 'Warranty & AMC Claims', description: 'Queries regarding warranty coverages, claims, or Annual Maintenance Contracts (AMC).' },
    { id: 5, name: 'General Inquiry / Feedback', description: 'Other questions, feedback about service center visits, or product suggestions.' }
  ];

  const mockTickets = [];
  const mockReplies = [];
  const mockUsers = [
    { id: 1, email: 'admin@forte.com', password: 'admin123', two_factor_secret: null, two_factor_enabled: 0, created_at: new Date().toISOString() },
    { id: 2, email: 'user@forte.com', password: 'user123', two_factor_secret: null, two_factor_enabled: 0, created_at: new Date().toISOString() },
    { id: 3, email: 'demo@forte.com', password: 'demo123', two_factor_secret: null, two_factor_enabled: 0, created_at: new Date().toISOString() },
  ];

  dbObject = {
    isMock: true,
    query: async (sql, params = []) => {
      console.log('Mock DB Query:', sql, 'Params:', params);

      // 0. User Login Query (Email + Password or Email only)
      if (sql.includes('SELECT * FROM users WHERE')) {
        if (sql.includes('password = ?')) {
          const [emailParam, passwordParam] = params;
          const found = mockUsers.filter(
            u => u.email.toLowerCase() === emailParam.toLowerCase() && u.password === passwordParam
          );
          return [found];
        } else {
          const [emailParam] = params;
          const found = mockUsers.filter(
            u => u.email.toLowerCase() === emailParam.toLowerCase()
          );
          return [found];
        }
      }

      // User Update Query (Enable / Update Two Factor)
      if (sql.includes('UPDATE users SET two_factor_secret = ?')) {
        const [secretParam, emailParam] = params;
        const userObj = mockUsers.find(
          u => u.email.toLowerCase() === emailParam.toLowerCase()
        );
        if (userObj) {
          userObj.two_factor_secret = secretParam;
          userObj.two_factor_enabled = 1;
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      // User Insert Query (Register)
      if (sql.includes('INSERT INTO users')) {
        let emailParam, passwordParam;
        if (params.length === 2) {
          [emailParam, passwordParam] = params;
        } else {
          // If name and phone were passed in a different version
          [, , emailParam, passwordParam] = params;
        }
        const newUser = {
          id: mockUsers.length + 1,
          email: emailParam,
          password: passwordParam,
          two_factor_secret: null,
          two_factor_enabled: 0,
          created_at: new Date().toISOString()
        };
        mockUsers.push(newUser);
        return [{ insertId: newUser.id }];
      }

      // 1. Get Help Topics
      if (sql.includes('SELECT * FROM help_topics')) {
        return [mockHelpTopics];
      }

      // 2. Create Support Ticket
      if (sql.includes('INSERT INTO tickets')) {
        const [ticket_number, name, email, phone, help_topic_id, priority] = params;
        const newTicket = {
          id: mockTickets.length + 1,
          ticket_number,
          name,
          email,
          phone,
          help_topic_id: parseInt(help_topic_id),
          priority: priority || 'Low',
          status: 'Open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        mockTickets.push(newTicket);
        return [{ insertId: newTicket.id }];
      }

      // 3. Track Ticket (Email & Ticket Number)
      if (sql.includes('FROM tickets t') && sql.includes('LOWER(t.email) = LOWER(?) AND t.ticket_number = ?')) {
        const [emailParam, ticketNumberParam] = params;
        const found = mockTickets.find(
          t => t.email && emailParam && t.email.toLowerCase() === emailParam.toLowerCase() &&
            t.ticket_number && ticketNumberParam && t.ticket_number.trim().toLowerCase() === ticketNumberParam.trim().toLowerCase()
        );
        if (found) {
          const topic = mockHelpTopics.find(h => h.id === found.help_topic_id);
          return [[{ ...found, help_topic_name: topic ? topic.name : 'General Inquiry' }]];
        }
        return [[]];
      }

      // 4. Get Replies for a Ticket
      if (sql.includes('SELECT * FROM ticket_replies WHERE ticket_id = ?')) {
        const [ticketId] = params;
        const foundReplies = mockReplies.filter(r => r.ticket_id === parseInt(ticketId));
        return [foundReplies];
      }

      // 5. Post a Reply on a Ticket
      if (sql.includes('INSERT INTO ticket_replies')) {
        const [ticket_id, sender, name, message] = params;
        const newReply = {
          id: mockReplies.length + 1,
          ticket_id: parseInt(ticket_id),
          sender,
          name,
          message,
          created_at: new Date().toISOString()
        };
        mockReplies.push(newReply);

        // Update ticket updated_at
        const ticketObj = mockTickets.find(t => t.id === parseInt(ticket_id));
        if (ticketObj) {
          ticketObj.updated_at = new Date().toISOString();
        }

        return [{ insertId: newReply.id }];
      }

      // 6. Staff Dashboard: List Tickets
      if (sql.includes('FROM tickets t') && !sql.includes('LOWER(t.email) = LOWER(?) AND t.ticket_number = ?')) {
        let results = mockTickets.map(t => {
          const topic = mockHelpTopics.find(h => h.id === t.help_topic_id);
          return { ...t, help_topic_name: topic ? topic.name : 'General Inquiry' };
        });

        // Status filter
        if (sql.includes('t.status = ?')) {
          const status = params[0];
          results = results.filter(t => t.status === status);
        }

        // Priority filter
        if (sql.includes('t.priority = ?')) {
          const priorityIndex = params.length - (sql.includes('LOWER(t.email)') ? 2 : 1);
          const priority = params[priorityIndex];
          results = results.filter(t => t.priority === priority);
        }

        // Email filter
        if (sql.includes('LOWER(t.email) = LOWER(?)')) {
          const emailIndex = params.length - 1;
          const email = params[emailIndex];
          results = results.filter(t => t.email.toLowerCase() === email.toLowerCase());
        }

        // Return reverse chronological order
        return [results.slice().reverse()];
      }

      // 7. Staff: Update Ticket Status
      if (sql.includes('UPDATE tickets SET status = ? WHERE id = ?')) {
        const [status, ticketId] = params;
        const ticketObj = mockTickets.find(t => t.id === parseInt(ticketId));
        if (ticketObj) {
          ticketObj.status = status;
          ticketObj.updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      // 8. Check if ticket exists
      if (sql.includes('SELECT id FROM tickets WHERE id = ?')) {
        const [ticketId] = params;
        const found = mockTickets.find(t => t.id === parseInt(ticketId));
        if (found) {
          return [[{ id: found.id }]];
        }
        return [[]];
      }

      // 9. Update ticket updated_at
      if (sql.includes('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')) {
        const [ticketId] = params;
        const ticketObj = mockTickets.find(t => t.id === parseInt(ticketId));
        if (ticketObj) {
          ticketObj.updated_at = new Date().toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      return [[]];
    }
  };
}

export default dbObject;
