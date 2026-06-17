import app from './app.js';
import { runAnomalyDetection } from './routes/alerts.js';

const PORT = process.env.PORT || 8484;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

setInterval(() => {
  try {
    runAnomalyDetection();
  } catch (err) {
    console.error('Anomaly detection error:', err);
  }
}, 60000);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;