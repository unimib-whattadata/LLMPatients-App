import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';

const servicesDir = path.join(process.cwd(), 'services');

const services = [
  {
    name: 'vibevoice',
    url: 'https://github.com/microsoft/VibeVoice',
    enabled: process.env.USE_VIBEVOICE === 'true',
  },
  {
    name: 'chatterbox',
    url: 'https://github.com/resemble-ai/chatterbox',
    enabled: process.env.USE_CHATTERBOX === 'true',
  },
];

// Ensure services directory exists
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

console.log('Checking services...');

services.forEach((service) => {
  if (!service.enabled) {
    console.log(`Service '${service.name}' is disabled in .env. Skipping.`);
    return;
  }

  const servicePath = path.join(servicesDir, service.name);
  if (!fs.existsSync(servicePath)) {
    console.log(`Service '${service.name}' not found. Cloning from ${service.url}...`);
    try {
      execSync(`git clone ${service.url} ${servicePath}`, { stdio: 'inherit' });
      console.log(`Successfully cloned ${service.name}.`);
    } catch (error) {
      console.error(`Failed to clone ${service.name}:`, error);
      // Don't exit process, just skip this service
      return;
    }
  } else {
    console.log(`Service '${service.name}' already exists.`);
  }

  // Attempt to install dependencies
  try {
    console.log(`Installing dependencies for ${service.name}...`);
    // check if we have pyproject.toml or requirements.txt
    const hasPyProject = fs.existsSync(path.join(servicePath, 'pyproject.toml'));
    const hasRequirements = fs.existsSync(path.join(servicePath, 'requirements.txt'));

    if (hasPyProject || hasRequirements) {
      // Use piped stdio to avoid spamming unless error? or 'inherit' to show progress?
      // Using inherit is better for long running installs so user sees progress
      const cmd = hasPyProject ? "pip3 install -e ." : "pip3 install -r requirements.txt";
      // Try to execute in the service directory
      execSync(cmd, { cwd: servicePath, stdio: 'inherit' });
      console.log(`Dependencies installed for ${service.name}.`);
    } else {
      console.log(`No dependency file found for ${service.name}, skipping install.`);
    }
  } catch (e) {
    console.warn(`Failed to install dependencies for ${service.name}. You might need to install them manually.`, e);
  }
});

console.log('All services are ready.');
