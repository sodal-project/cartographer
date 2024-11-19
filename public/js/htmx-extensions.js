
/**
 * Adds an attribute to htmx that allows us to handle downloading a file from a form submission.
 * 
 * @example
 * <form
 *   hx-ext="download-csv"
 *   hx-post="/mod/exportCsv/download/download"
 *   hx-swap="none"
 *   hx-target="this"
 * </form>
 */
htmx.defineExtension('download-csv', {
  onEvent: async function (name, event) {
    if (name === 'htmx:configRequest') {
      const form = event.detail.elt;
      const method = 'POST';
      const url = form.getAttribute('hx-post');

      // Convert FormData to a plain object
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      // Prevent the default form submission
      event.preventDefault();

      try {
        // Fetch the file
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'HTMX',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to download file');
        }

        // Extract the filename from the response headers
        const fileName =
          response.headers
            .get('Content-Disposition')
            ?.split('filename=')[1]
            ?.replace(/"/g, '') || 'download.csv';

        // Create a blob from the response
        const blob = await response.blob();

        // Create a link and click it to download the file
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        // Remove the temporary link and revoke the object URL
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('There was an issue downloading the file.');
      }
    }
  },
});
