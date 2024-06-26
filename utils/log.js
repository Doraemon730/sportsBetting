const fs = require('fs');
const path = require('path');

// Get the current date
const currentDate = new Date();
const formattedDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '');

// Define the log file path with the current date
let logFileName = `server_${formattedDate}.log`;
let logFilePath = path.join(__dirname, '../logs', logFileName);

// Create a write stream to the log file
let logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Override the console.log function to log to both console and file
console.log = function(message, onlyFile = false) {
  // Prepare the log message
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let fileName = `server_${day}.log`;
  if(logFileName != fileName)
  {
    logFileName = `server_${day}.log`;
    logFilePath = path.join(__dirname, '../logs', logFileName);

// Create a write stream to the log file
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  }
  let logMessage = `${new Date().toLocaleString('en-US')} : ${message}`;  
    // Create an Error object to capture the stack trace
    const error = new Error();
    // Parse the stack trace to get the function name and code line
    const stackLines = error.stack.split('\n');    
    const callerLine = stackLines[2].trim();
    const callerFunction = callerLine.substring(
      callerLine.lastIndexOf('at ') + 3,
      callerLine.lastIndexOf(' ')
    );

    // Add function name and code line to the log message
    logMessage += ` - Function: ${callerFunction}, Line: ${callerLine}`;
    
    // Log to file
    logStream.write(logMessage + '\n');
  
 
  // Log to console
    if(!onlyFile)
        process.stdout.write(logMessage + '\n');
};