const fs = require('fs');
const { pipeline } = require('stream');
const csv = require('csv-parser');

// Listen for messages from the parent process
process.on('message', (message) => {
  const { csvFilePath } = message;

  // Create a readable stream from the CSV file
  const readStream = fs.createReadStream(csvFilePath);

  // Set up a pipeline to read the CSV and send data back to the parent
  pipeline(
    readStream,
    csv(),  // Use csv-parser to convert CSV rows into objects
    async function* (source) {
      for await (const chunk of source) {
        // Send each row back to the parent as a JSON string
        process.send(JSON.stringify(chunk) + '\n');
      }
    },
    (err) => {
      if (err) {
        console.error('Pipeline failed:', err);
        process.exit(1);
      } else {
        process.exit(0);  // End the child process when done
      }
    }
  );
});
