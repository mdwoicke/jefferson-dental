#!/usr/bin/env node

/**
 * Smart startup script that:
 * 1. Starts ngrok
 * 2. Gets the ngrok URL
 * 3. Automatically updates backend/.env
 * 4. Starts backend and frontend
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const backendDir = join(rootDir, 'backend');
const envPath = join(backendDir, '.env');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, prefix, message) => {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
};

const processes = [];

// Cleanup function
const cleanup = () => {
  log(colors.yellow, '\n🛑', 'Shutting down all services...');
  processes.forEach(proc => {
    try {
      proc.kill();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Wait for a condition with timeout
const waitFor = (checkFn, timeout = 30000, interval = 500) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (checkFn()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
};

// Get ngrok URL from API
const getNgrokUrl = async () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          const httpsTunnel = tunnels.tunnels?.find(t => t.public_url.startsWith('https://'));
          if (httpsTunnel) {
            resolve(httpsTunnel.public_url);
          } else {
            reject(new Error('No HTTPS tunnel found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
};

// Update .env file with ngrok URL
const updateEnvFile = (ngrokUrl) => {
  if (!existsSync(envPath)) {
    log(colors.red, '❌', `backend/.env not found at ${envPath}`);
    log(colors.yellow, '💡', 'Copy backend/.env.example to backend/.env first');
    process.exit(1);
  }

  let envContent = readFileSync(envPath, 'utf8');

  // Backup original .env
  const backupPath = envPath + '.backup';
  writeFileSync(backupPath, envContent);

  // Update BACKEND_HOST
  if (envContent.includes('BACKEND_HOST=')) {
    envContent = envContent.replace(
      /BACKEND_HOST=.*/,
      `BACKEND_HOST=${ngrokUrl}`
    );
  } else {
    envContent += `\nBACKEND_HOST=${ngrokUrl}\n`;
  }

  writeFileSync(envPath, envContent);
  log(colors.green, '✅', `Updated backend/.env with BACKEND_HOST=${ngrokUrl}`);
  log(colors.cyan, '💾', `Backup saved to ${backupPath}`);
};

// Start a process and capture output
const startProcess = (name, command, args, cwd, color) => {
  const proc = spawn(command, args, {
    cwd: cwd || rootDir,
    stdio: 'pipe',
    shell: true
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      console.log(`${color}[${name}]${colors.reset} ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      console.log(`${color}[${name}]${colors.reset} ${line}`);
    });
  });

  proc.on('close', (code) => {
    if (code !== 0 && code !== null) {
      log(colors.red, '❌', `${name} exited with code ${code}`);
    }
  });

  processes.push(proc);
  return proc;
};

// Main startup sequence
const main = async () => {
  console.clear();
  log(colors.blue, '╔══════════════════════════════════════════════╗', '');
  log(colors.blue, '║', '  Jefferson Dental Telephony Startup     ║');
  log(colors.blue, '╚══════════════════════════════════════════════╝', '');
  console.log();

  try {
    // Step 1: Check if .env exists
    if (!existsSync(envPath)) {
      log(colors.red, '❌', 'backend/.env not found!');
      log(colors.yellow, '💡', 'Run: cp backend/.env.example backend/.env');
      log(colors.yellow, '💡', 'Then add your Twilio credentials');
      process.exit(1);
    }

    // Step 2: Start ngrok
    log(colors.magenta, '🚀 [1/4]', 'Starting ngrok on port 3001...');
    startProcess('NGROK', 'ngrok', ['http', '3001'], null, colors.magenta);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Get ngrok URL and update .env
    log(colors.cyan, '🔍 [2/4]', 'Getting ngrok URL...');
    let ngrokUrl;

    try {
      await waitFor(async () => {
        try {
          ngrokUrl = await getNgrokUrl();
          return true;
        } catch {
          return false;
        }
      }, 15000);

      log(colors.green, '✅', `ngrok URL: ${ngrokUrl}`);

      log(colors.cyan, '📝 [3/4]', 'Updating backend/.env...');
      updateEnvFile(ngrokUrl);

    } catch (e) {
      log(colors.red, '❌', 'Failed to get ngrok URL');
      log(colors.yellow, '⚠️', 'Make sure ngrok is installed: npm install -g ngrok');
      cleanup();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Start backend
    log(colors.blue, '🔧 [4/4]', 'Starting backend server...');
    startProcess('BACKEND', 'npm', ['run', 'dev'], backendDir, colors.blue);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Start frontend
    log(colors.green, '🌐 [5/5]', 'Starting frontend...');
    startProcess('FRONTEND', 'npm', ['run', 'dev'], rootDir, colors.green);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // All done!
    console.log();
    log(colors.green, '╔══════════════════════════════════════════════╗', '');
    log(colors.green, '║', '  ✨ All services running!               ║');
    log(colors.green, '╚══════════════════════════════════════════════╝', '');
    console.log();
    log(colors.magenta, '📡', `ngrok:         ${ngrokUrl}`);
    log(colors.blue, '🔧', 'Backend:       http://localhost:3001');
    log(colors.green, '🌐', 'Frontend:      http://localhost:3000');
    log(colors.cyan, '📊', 'ngrok inspect: http://localhost:4040');
    console.log();
    log(colors.yellow, '💡', 'Open http://localhost:3000 and select "Phone Call" mode');
    log(colors.yellow, '⚠️', 'Press Ctrl+C to stop all services');
    console.log();

  } catch (error) {
    log(colors.red, '❌', `Error: ${error.message}`);
    cleanup();
  }
};

main();
