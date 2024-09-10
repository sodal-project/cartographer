const fs = require('fs');
const path = require('path');

const rowCount = 10000000;
const columnCount = 10;
const outputFilePath = path.join(__dirname, 'large-file.csv');

// Function to generate a random string of specified length
function getRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to generate a row of random data
function generateRow(columnCount) {
  const row = [];
  for (let i = 0; i < columnCount; i++) {
    row.push(getRandomString(10)); // Each cell contains a random string of length 10
  }
  return row.join(','); // Join columns with a comma to form a CSV row
}

// Create a write stream for the CSV file
const writeStream = fs.createWriteStream(outputFilePath);

// Write the header row
writeStream.write(Array.from({ length: columnCount }, (_, i) => `Column${i + 1}`).join(',') + '\n');

// Write data rows
for (let i = 0; i < rowCount; i++) {
  const row = generateRow(columnCount);
  writeStream.write(row + '\n');

  // Log progress every 100,000 rows
  if ((i + 1) % 100000 === 0) {
    console.log(`Generated ${i + 1} rows`);
  }
}

// End the write stream
writeStream.end(() => {
  console.log(`Large CSV file generated at ${outputFilePath}`);
});
