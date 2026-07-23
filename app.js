const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve the UI
app.use(express.static(path.join(__dirname, 'public')));

// Initialize PostgreSQL database pool
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'sampleapp',
  password: process.env.PGPASSWORD || 'mysecretpassword',
  port: process.env.PGPORT || 5432,
});

// Create tables if they don't exist
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Optionally seed an admin user
    const hash = await bcrypt.hash('password', 10);
    await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
      ['admin', hash]
    );
    console.log('Connected to PostgreSQL and tables initialized.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
};
initDb();

// JSON info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Startup Tech Co. - Sample Web App',
    version: process.env.BUILD_VERSION || '1.0.0-dev',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname()
  });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`,
      [username, hash]
    );
    res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') { // Postgres unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      res.json({ message: 'Login successful', userId: user.id, username: user.username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add Note endpoint
app.post('/api/notes', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'User ID and content required' });

  try {
    const result = await pool.query(
      `INSERT INTO notes (user_id, content) VALUES ($1, $2) RETURNING id`,
      [userId, content]
    );
    res.status(201).json({ message: 'Note added successfully', noteId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Notes endpoint
app.get('/api/notes', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  try {
    const result = await pool.query(`SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
