import core from '../../core/core.js';

const handleModuleFunction = async (req, res) => {
  const { moduleName, command } = req.params;
  let data = req.body;

  // If it's a GET request, clear `data` as it might not be used.
  if (req.method === 'GET') {
    data = req.query;
  }
  
  // Include file data if it exists (for file upload routes)
  if (req.file) {
    data.file = req.file;
  }

  try {
    const moduleResponse = await core.mod[moduleName][command](data);
    res.send(moduleResponse);
  } catch (error) {
    console.error('Error calling module command:', error);
    res.status(500).send('Error executing module command');
  }
};

const handleModuleFunctionDownload = async (req, res) => {
  const { moduleName, command } = req.params;
  let data = req.body;

  try {
    const moduleResponse = await core.mod[moduleName][command](data);
    const { file, fileName, type } = moduleResponse;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', type);
    res.send(file);
  } catch (error) {
    res.status(500).send('Error executing module command');
  }
};

export {
  handleModuleFunction,
  handleModuleFunctionDownload,
};
