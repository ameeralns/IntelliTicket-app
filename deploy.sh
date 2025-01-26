#!/bin/bash

# Install Node.js and npm if not already installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install dependencies
npm ci

# Build the application
npm run build

# Start the application with PM2
pm2 start npm --name "intelliticket" -- start

# Save PM2 process list and configure to start on system startup
pm2 save
pm2 startup 