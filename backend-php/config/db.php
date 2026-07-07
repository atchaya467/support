<?php
// Load environment variables if .env exists in parent or current directory
$envPaths = [__DIR__ . '/../.env', __DIR__ . '/../../.env'];
foreach ($envPaths as $envPath) {
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $_ENV[trim($parts[0])] = trim($parts[1]);
            }
        }
    }
}

$db_host = $_ENV['DB_HOST'] ?? 'localhost';
$db_port = $_ENV['DB_PORT'] ?? '3306';
$db_name = $_ENV['DB_NAME'] ?? 'support';
$db_user = $_ENV['DB_USER'] ?? 'root';
$db_pass = $_ENV['DB_PASSWORD'] ?? '';

$pdo = null;

try {
    // Try connecting to MySQL
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // If MySQL connection fails, fall back to SQLite support.db
    $sqlitePath = __DIR__ . '/../support.db';
    try {
        $pdo = new PDO("sqlite:$sqlitePath");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        initializeSQLite($pdo);
    } catch (PDOException $se) {
        die("Database connection failed: " . $se->getMessage());
    }
}

function initializeSQLite($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        two_factor_secret TEXT DEFAULT NULL,
        two_factor_enabled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS help_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL
    )");

    $count = $db->query("SELECT COUNT(*) FROM help_topics")->fetchColumn();
    if ($count == 0) {
        $db->exec("INSERT INTO help_topics (id, name, description) VALUES
            (1, 'Engine & Transmission', 'Issues related to engine performance, transmission, fuel system, or exhaust.'),
            (2, 'Electrical & Electronics', 'Issues with battery, wiring, instrument cluster, starter motor, alternator, or lights.'),
            (3, 'Chassis & Suspension', 'Issues regarding steering, brakes, suspension, axles, tires, or wheel alignment.'),
            (4, 'Warranty & AMC Claims', 'Queries regarding warranty coverages, claims, or Annual Maintenance Contracts (AMC).'),
            (5, 'General Inquiry / Feedback', 'Other questions, feedback about service center visits, or product suggestions.')");
    }

    $db->exec("CREATE TABLE IF NOT EXISTS tickets (
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
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS ticket_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $userCount = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount == 0) {
        $db->exec("INSERT INTO users (email, password) VALUES
            ('admin@forte.com', 'admin123'),
            ('user@forte.com', 'user123'),
            ('demo@forte.com', 'demo123')");
    }
}

return $pdo;
