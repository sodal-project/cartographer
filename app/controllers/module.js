const core = require('../../core/core.js');

const handleModuleFunction = async (req, res) => {
  const { moduleName, command } = req.params;
  let data = req.body;

  // If it's a GET request, clear `data` as it might not be used.
  if (req.method === 'GET') {
    data = {};
  }
  
  // Include file data if it exists (for file upload routes)
  if (req.file) {
    data.file = req.file;
  }

  try {
    const moduleResponse = await core.mod[moduleName][command](data);
    res.send(moduleResponse);
  } catch (err) {
    console.error('Error calling module command:', err);
    res.status(500).send('Error executing module command');
  }
};


module.exports = {
  handleModuleFunction
};
