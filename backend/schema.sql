CREATE DATABASE IF NOT EXISTS support;
USE support;

DROP TABLE IF EXISTS ticket_replies;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS help_topics;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password) VALUES
('admin@example.com', 'admin123'),
('user@example.com', 'user123'),
('demo@example.com', 'demo123');

CREATE TABLE help_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL
);

INSERT INTO help_topics (id, name, description) VALUES
(1, 'Engine & Transmission', 'Issues related to engine performance, transmission, fuel system, or exhaust.'),
(2, 'Electrical & Electronics', 'Issues with battery, wiring, instrument cluster, starter motor, alternator, or lights.'),
(3, 'Chassis & Suspension', 'Issues regarding steering, brakes, suspension, axles, tires, or wheel alignment.'),
(4, 'Warranty & AMC Claims', 'Queries regarding warranty coverages, claims, or Annual Maintenance Contracts (AMC).'),
(5, 'General Inquiry / Feedback', 'Other questions, feedback about service center visits, or product suggestions.');

CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    help_topic_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Low',
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (help_topic_id) REFERENCES help_topics(id)
);

CREATE TABLE ticket_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
