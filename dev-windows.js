// Windows-compatible development script
process.env.NODE_ENV = 'development';

// Import and start the server
import('./server/index.ts').catch(console.error);