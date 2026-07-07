<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// Connect to database
$pdo = require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/totp.php';

// Ensure pending_2fa table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS pending_2fa (
        email VARCHAR(255) PRIMARY KEY,
        secret VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    // Ignore if already exists or fails
}

// Parse request body if JSON
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Helper to generate ticket number
function generateTicketNumber() {
    return 'AL-' . rand(100000, 999999);
}

// Router
if ($requestUri === '/api/register' && $method === 'POST') {
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required.']);
        exit();
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Please provide a valid email address.']);
        exit();
    }

    try {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'An account with this email address already exists.']);
            exit();
        }

        // Insert user
        $stmt = $pdo->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
        $stmt->execute([$email, $password]);

        // Initiate 2FA
        $secret = TOTP::generateSecret();
        
        // Save to pending_2fa
        $stmtDel = $pdo->prepare('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)');
        $stmtDel->execute([$email]);
        
        $stmtIns = $pdo->prepare('INSERT INTO pending_2fa (email, secret) VALUES (?, ?)');
        $stmtIns->execute([$email, $secret]);

        $otpauthUrl = "otpauth://totp/Support%20Center:" . rawurlencode($email) . "?secret={$secret}&issuer=Support%20Center";
        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . rawurlencode($otpauthUrl);

        echo json_encode([
            'message' => 'Account registered successfully. 2FA Setup Required.',
            'mfaRequired' => true,
            'mfaSetup' => true,
            'email' => $email,
            'secret' => $secret,
            'qrCodeUrl' => $qrCodeUrl
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error during registration: ' . $e->getMessage()]);
    }
    exit();
}

if ($requestUri === '/api/login' && $method === 'POST') {
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required.']);
        exit();
    }

    try {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Auto register
            $stmt = $pdo->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
            $stmt->execute([$email, $password]);
            
            $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$email]);
            $user = $stmt->fetch();
        } else {
            if ($user['password'] !== $password) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid email or password.']);
                exit();
            }
        }

        $twoFactorEnabled = (bool)($user['two_factor_enabled'] ?? false);

        if (!$twoFactorEnabled) {
            $secret = TOTP::generateSecret();
            
            // Save to pending_2fa
            $stmtDel = $pdo->prepare('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)');
            $stmtDel->execute([$email]);
            
            $stmtIns = $pdo->prepare('INSERT INTO pending_2fa (email, secret) VALUES (?, ?)');
            $stmtIns->execute([$email, $secret]);

            $otpauthUrl = "otpauth://totp/Support%20Center:" . rawurlencode($user['email']) . "?secret={$secret}&issuer=Support%20Center";
            $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . rawurlencode($otpauthUrl);

            echo json_encode([
                'message' => '2FA Setup Required. Scan the QR code to proceed.',
                'mfaRequired' => true,
                'mfaSetup' => true,
                'email' => $user['email'],
                'secret' => $secret,
                'qrCodeUrl' => $qrCodeUrl
            ]);
        } else {
            echo json_encode([
                'message' => '2FA Verification Required.',
                'mfaRequired' => true,
                'mfaSetup' => false,
                'email' => $user['email']
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error during login: ' . $e->getMessage()]);
    }
    exit();
}

if ($requestUri === '/api/verify-2fa' && $method === 'POST') {
    $email = trim($input['email'] ?? '');
    $token = trim($input['token'] ?? '');
    $isSetup = (bool)($input['isSetup'] ?? false);

    if (empty($email) || empty($token)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and verification code are required.']);
        exit();
    }

    try {
        if ($isSetup) {
            $stmt = $pdo->prepare('SELECT secret FROM pending_2fa WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$email]);
            $pending = $stmt->fetch();
            $secret = $pending['secret'] ?? null;

            if (!$secret) {
                http_response_code(400);
                echo json_encode(['error' => 'Session expired or 2FA not initiated. Please sign in again.']);
                exit();
            }

            if (!TOTP::verify($secret, $token)) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid verification code. Please try again.']);
                exit();
            }

            // Save secret to user
            $stmt = $pdo->prepare('UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$secret, $email]);

            // Clean up pending
            $stmtDel = $pdo->prepare('DELETE FROM pending_2fa WHERE LOWER(email) = LOWER(?)');
            $stmtDel->execute([$email]);

            echo json_encode([
                'message' => '2FA Setup successful. Login complete.',
                'email' => $email
            ]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found.']);
                exit();
            }

            $secret = $user['two_factor_secret'] ?? null;
            $isEnabled = (bool)($user['two_factor_enabled'] ?? false);

            if (!$isEnabled || !$secret) {
                http_response_code(400);
                echo json_encode(['error' => 'Two-factor authentication is not enabled for this account.']);
                exit();
            }

            if (!TOTP::verify($secret, $token)) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid verification code. Please try again.']);
                exit();
            }

            echo json_encode([
                'message' => '2FA code verified successfully. Login complete.',
                'email' => $email
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error during 2FA verification: ' . $e->getMessage()]);
    }
    exit();
}

if ($requestUri === '/api/help-topics' && $method === 'GET') {
    try {
        $stmt = $pdo->query('SELECT * FROM help_topics ORDER BY name ASC');
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to retrieve help topics.']);
    }
    exit();
}

if ($requestUri === '/api/tickets' && $method === 'POST') {
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $help_topic_id = trim($input['help_topic_id'] ?? '');
    $priority = trim($input['priority'] ?? 'Low');

    if (empty($name) || empty($email) || empty($phone) || empty($help_topic_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Name, email, phone and help topic are required.']);
        exit();
    }

    try {
        $ticketNumber = generateTicketNumber();
        $stmt = $pdo->prepare('INSERT INTO tickets (ticket_number, name, email, phone, help_topic_id, priority, status) VALUES (?, ?, ?, ?, ?, ?, "Open")');
        $stmt->execute([$ticketNumber, $name, $email, $phone, $help_topic_id, $priority]);

        echo json_encode([
            'message' => 'Ticket created successfully',
            'ticketId' => $pdo->lastInsertId(),
            'ticketNumber' => $ticketNumber
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create ticket: ' . $e->getMessage()]);
    }
    exit();
}

if ($requestUri === '/api/tickets/track' && $method === 'GET') {
    $email = trim($_GET['email'] ?? '');
    $ticketNumber = trim($_GET['ticket_number'] ?? '');

    if (empty($email) || empty($ticketNumber)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and ticket number are required.']);
        exit();
    }

    try {
        $stmt = $pdo->prepare('SELECT t.*, ht.name AS help_topic_name 
            FROM tickets t
            JOIN help_topics ht ON t.help_topic_id = ht.id
            WHERE LOWER(t.email) = LOWER(?) AND t.ticket_number = ?');
        $stmt->execute([$email, $ticketNumber]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['error' => 'No ticket found with matching details.']);
            exit();
        }

        echo json_encode($ticket);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error tracking ticket.']);
    }
    exit();
}

// Get or Post replies
if (preg_match('#^/api/tickets/([0-9]+)/replies$#', $requestUri, $matches)) {
    $ticketId = $matches[1];

    if ($method === 'GET') {
        try {
            $stmt = $pdo->prepare('SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC');
            $stmt->execute([$ticketId]);
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch replies.']);
        }
        exit();
    }

    if ($method === 'POST') {
        $sender = trim($input['sender'] ?? '');
        $name = trim($input['name'] ?? '');
        $message = trim($input['message'] ?? '');

        if (empty($sender) || empty($name) || empty($message)) {
            http_response_code(400);
            echo json_encode(['error' => 'Sender, name, and message are required.']);
            exit();
        }

        try {
            // Check ticket exists
            $stmt = $pdo->prepare('SELECT id FROM tickets WHERE id = ?');
            $stmt->execute([$ticketId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Ticket not found.']);
                exit();
            }

            // Insert reply
            $stmt = $pdo->prepare('INSERT INTO ticket_replies (ticket_id, sender, name, message) VALUES (?, ?, ?, ?)');
            $stmt->execute([$ticketId, $sender, $name, $message]);
            $replyId = $pdo->lastInsertId();

            // Update ticket updated_at
            $stmtUpd = $pdo->prepare('UPDATE tickets SET updated_at = ? WHERE id = ?');
            $stmtUpd->execute([date('Y-m-d H:i:s'), $ticketId]);

            echo json_encode([
                'id' => $replyId,
                'ticket_id' => (int)$ticketId,
                'sender' => $sender,
                'name' => $name,
                'message' => $message,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to post reply: ' . $e->getMessage()]);
        }
        exit();
    }
}

if ($requestUri === '/api/staff/tickets' && $method === 'GET') {
    $status = $_GET['status'] ?? '';
    $priority = $_GET['priority'] ?? '';
    $search = $_GET['search'] ?? '';
    $email = $_GET['email'] ?? '';

    $query = 'SELECT t.*, ht.name AS help_topic_name FROM tickets t JOIN help_topics ht ON t.help_topic_id = ht.id WHERE 1=1';
    $params = [];

    if (!empty($email)) {
        $query .= ' AND LOWER(t.email) = LOWER(?)';
        $params[] = $email;
    }
    if (!empty($status)) {
        $query .= ' AND t.status = ?';
        $params[] = $status;
    }
    if (!empty($priority)) {
        $query .= ' AND t.priority = ?';
        $params[] = $priority;
    }
    if (!empty($search)) {
        $query .= ' AND (t.ticket_number LIKE ? OR t.name LIKE ? OR t.email LIKE ?)';
        $searchVal = "%$search%";
        $params[] = $searchVal;
        $params[] = $searchVal;
        $params[] = $searchVal;
    }

    $query .= ' ORDER BY t.created_at DESC';

    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to query tickets.']);
    }
    exit();
}

if (preg_match('#^/api/staff/tickets/([0-9]+)/status$#', $requestUri, $matches)) {
    $ticketId = $matches[1];

    if ($method === 'PUT') {
        $status = trim($input['status'] ?? '');
        $validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

        if (empty($status) || !in_array($status, $validStatuses)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or missing status value.']);
            exit();
        }

        try {
            $stmt = $pdo->prepare('UPDATE tickets SET status = ? WHERE id = ?');
            $stmt->execute([$status, $ticketId]);

            echo json_encode(['message' => "Ticket status successfully updated to $status"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update ticket status.']);
        }
        exit();
    }
}

// Fallback: 404 Not Found
http_response_code(404);
echo json_encode(['error' => 'Not Found']);
