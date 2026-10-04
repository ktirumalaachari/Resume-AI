// Unified runner to start all backend microservices + gateway on a single Render container
const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'auth-service', cwd: path.join(__dirname, 'services/auth-service'), port: 4001 },
  { name: 'agent-service', cwd: path.join(__dirname, 'services/agent-service'), port: 4002 },
  { name: 'interview-service', cwd: path.join(__dirname, 'services/interview-service'), port: 4003 },
  { name: 'roadmap-service', cwd: path.join(__dirname, 'services/roadmap-service'), port: 4004 },
  { name: 'billing-service', cwd: path.join(__dirname, 'services/billing-service'), port: 4005 },
];

const children = [];

console.log('Starting backend microservices on internal ports 4001-4005...');

for (const s of services) {
  const child = spawn('node', ['dist/index.js'], {
    cwd: s.cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(s.port),
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  });

  child.on('exit', (code, signal) => {
    console.error(`[${s.name}] exited with code ${code} (signal ${signal})`);
  });

  children.push(child);
}

// Start Gateway on Render's assigned PORT
const publicPort = process.env.PORT || '4000';
console.log(`Starting API Gateway on public port ${publicPort}...`);

const gateway = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, 'gateway'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: publicPort,
    NODE_ENV: process.env.NODE_ENV || 'production',
    AUTH_SERVICE_URL: 'http://localhost:4001',
    AGENT_SERVICE_URL: 'http://localhost:4002',
    INTERVIEW_SERVICE_URL: 'http://localhost:4003',
    ROADMAP_SERVICE_URL: 'http://localhost:4004',
    BILLING_SERVICE_URL: 'http://localhost:4005',
  },
});

gateway.on('exit', (code) => {
  console.log(`Gateway process exited with code ${code}`);
  for (const c of children) {
    try {
      c.kill();
    } catch {}
  }
  process.exit(code ?? 0);
});

function cleanup() {
  console.log('Shutting down all services...');
  gateway.kill();
  for (const c of children) {
    try {
      c.kill();
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
