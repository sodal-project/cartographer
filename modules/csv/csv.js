const core = require('../../core/core');

/**
 * 
 * @param {object} instance 
 */
const sync = async (fileId, fileName, fileData) => {
  try {
    const source = {
      id: `source:csv:${fileId}`,
      name: fileName,
      lastUpdate: new Date().toISOString()
    }

    console.log(`Processing CSV file ${fileName}...`);
    const r0 = fileData[0];
    let personas = [];

    // process personas csv
    if(r0.hasOwnProperty("id")&&r0.hasOwnProperty("type")&&r0.hasOwnProperty("platform")){
      console.log('Processing personas...');
      personas = personas.concat(mapCsvPersonas(fileData));

    // process relationships csv
    } else if(r0.hasOwnProperty("controlUpn")&&r0.hasOwnProperty("obeyUpn")){
      console.log('Processing relationships...');
      const relationships = mapCsvRelationships(fileData);
      personas = personas.concat(core.persona.getFromRelationships(relationships));

    } else {
      throw Error('CSV file does not contain the required columns');
    }

    // generate and process sync queries
    await core.graph.syncPersonas(personas, source);

    // await graph.runRawQueryArray(queries);
    console.log(`CSV file processed successfully`);

  } catch (error) {
    console.error('Error processing CSV file:', error);
  }
}

const mapCsvPersonas = (data) => {
  const personas = [];
  for(const i in data) {
    if(i === 0) { continue; }
    const persona = {
      upn: `upn:${data[i].platform}:${data[i].type}:${data[i].id}`,
      ...data[i]
    }
    persona.id = `${persona.id}`;
    personas.push(persona);
  }
  return personas;
}

const mapCsvRelationships = (data) => {
  const relationships = [];
  for(const i in data) {
    if(i === 0) { continue; }
    const rel = data[i];
    rel.level = parseInt(rel.level);
    rel.confidence = parseFloat(rel.confidence);
    if(rel.authorizationMin){
      rel.authorizationMin = parseInt(rel.authorizationMin);
    }
    relationships.push(data[i]);
  }
  return relationships;
}

module.exports = {
  sync,
}