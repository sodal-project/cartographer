let spinnerTimeout;

// Show the spinner after 1 second if the request is still in progress
document.body.addEventListener('htmx:beforeRequest', (event) => {
  spinnerTimeout = setTimeout(() => {
    document.getElementById('spinner').style.visibility = 'visible';
    document.getElementById('main').style.visibility = 'hidden';
  }, 300);
});

// Hide the spinner and clear the timeout immediately after the request is finished
document.body.addEventListener('htmx:afterRequest', (event) => {
  clearTimeout(spinnerTimeout);  // Cancel showing the spinner if request finishes quickly
  document.getElementById('spinner').style.visibility = 'hidden';
  document.getElementById('main').style.visibility = 'visible';
});
