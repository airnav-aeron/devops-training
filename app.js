const express = require('express');
const path = require('path');
const app = express();

// Serve the UI
app.use(express.static(path.join(__dirname, 'public')));

// JSON info endpoint (used by the UI's JS, and later for reference)
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Startup Tech Co. - Sample Web App',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname()
  });
});

// Health check endpoint (used later by Kubernetes probes)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
