const core = require('../../core/core.js');

async function mainPane(context) {
  if (context.req?.method === 'POST') {
    return handlePost(context);
  }
  return handleGet(context);
}

async function handleGet() {
  const filters = await core.config.readConfig('filters') || {};
  const sortedFilters = Object.values(filters)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return core.client.render('mainPane.hbs', { 
    filters: sortedFilters,
    helpers: {
      json: JSON.stringify
    }
  });
}

async function handlePost(context) {
  console.log('POST received:', context.req.body);
  
  const { name, expression } = context.req.body;
  
  if (!name || !expression) {
    console.error('Missing required fields:', { name, expression });
    return handleGet();
  }

  try {
    // Validate JSON
    JSON.parse(expression);
    
    // Load existing filters
    const filters = await core.config.readConfig('filters') || {};
    
    // Add new filter
    const newId = `filter-${Date.now()}`;
    filters[newId] = {
      id: newId,
      name,
      expression,
      updatedAt: new Date().toISOString()
    };
    
    // Save just the filters object
    await core.config.writeConfig( {filters} );
    console.log('Filter created:', newId);
    
  } catch (error) {
    console.error('Invalid filter JSON:', error);
  }

  return handleGet();
}

module.exports = { mainPane };

