const fs = require('fs');
const Schedule = require('./schedule');

if (!fs.existsSync('data/input.json')) {
  console.log('The file does not exist! Please, provide data/input.json!');
  return;
}

// Load data from local file
const inputData = JSON.parse(fs.readFileSync('data/input.json', 'utf8'));

// Instantiate new Schedule class
const schedule = new Schedule(inputData);

// Generate optimized schedule
const result = schedule.getSchedule();

// Checking for errors
const errors = schedule.getErrors();
if (errors.length) {
  errors.map((error) => console.log(error));
}

// Convert schedule object into JSON string
const outputData = JSON.stringify(result, null, ' ');

// Save JSON string into file
fs.writeFile('data/output_new.json', outputData, function (error) {
  if (error) {
    console.log(error);
    return;
  }
  console.log('Schedule was saved into data/output_new.json!');
});
