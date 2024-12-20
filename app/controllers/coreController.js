import core from '../../core/core.js';

/**
 * Root
 * Serve the index.html file, if there is a moduleName and command passed
 * load that modules response into the main property of data.
 */ 
const renderHomePage = async (req, res) => {
  const { moduleName, command } = req.params;
  const data = {...core.coreData, user: req.user  };  

  // Call the module function and set the response in the main attribute
  if (moduleName && command) {
    data.currentModule = moduleName;
    try {
      const moduleResponse = await core.mod[moduleName][command](req.query);
      data.main = moduleResponse;
    } catch (err) {
      console.error('Error calling module command:', err);
      res.status(500).send('Error executing module command');
    }
  }
  
  res.render("app/templates/index", data); 
};

export {
  renderHomePage
};