const fs = require('fs');
const path = require('path');

// Function to get a timestamp string
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/:/g, '-'); // Replace colons to avoid issues in filenames
};

// Ensure the logs directory exists
const ensureLogsDirectoryExists = () => {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
};

// Function to log messages to a file and console
const logToFileAndConsole = (message, type = 'INFO') => {
  ensureLogsDirectoryExists();
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  // Log to console
  console.log(logMessage);

  // Log to file
  const logFilePath = path.join(__dirname, `logs/log-${timestamp}.txt`);
  fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
};

// Backend logging function
const logBackend = (source, message, details = {}) => {
  const logMessage = `Backend - ${source}: ${message} ${JSON.stringify(details)}`;
  logToFileAndConsole(logMessage, 'BACKEND');
};

module.exports = { logBackend };
