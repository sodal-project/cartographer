const express = require('express');
const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

app.get('/process-csv', (req, res) => {
  const csvFilePath = path.join(__dirname, 'large-file.csv');
  const destFilePath = path.join(__dirname, 'output-file.csv');

  // Fork the child process to handle reading and streaming the CSV data
  const child = fork(path.join(__dirname, 'streaming-child.js'));

  // Create a write stream for the output file
  const writeStream = fs.createWriteStream(destFilePath);

  // Handle data received from the child process and write it to the new file
  child.on('message', (data) => {
    writeStream.write(data);
  });

  // Handle the end of the data stream
  child.on('exit', (code) => {
    writeStream.end();  // Close the write stream
    if (code === 0) {
      res.send('CSV processing completed and data written to outputFile.csv');
    } else {
      res.status(500).send('Error processing CSV file');
    }
  });

  // Start the child process with the CSV file path
  child.send({ csvFilePath });
});

// Start the Express server
app.listen(3001, () => {
  console.log(`Server is running on port 3001. Visit http://localhost:3001/process-csv to start processing the CSV.`);
});
