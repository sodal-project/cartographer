const core = require('../../core/core');

async function sync(instance){
  try {
    console.log('Syncing BambooHR Instance: ', instance.name);

    const instanceId = instance.id;
    const name = instance.name;
    const token = await core.crypto.decrypt(instance.secret);
    const subdomain = instance.subdomain;
    const reportId = instance.reportId;

    const source = core.source.getSourceObject('bamboohr', instanceId, name);

    const json = await apiCall(subdomain, reportId, token);

    return `BambooHR instance synced: ${name}`;
  } catch (error) {
    return `Error syncing BambooHR instance: ${error.message}`;
  }
}

async function apiCall(subdomain, reportId, token) {


  const url = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/custom-reports/${reportId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "Authorization": "Basic " + btoa(token + ":x"),
      "Accept": "application/json",
    }
  });
  const json = await response.json();

  await core.cache.save(`bamboohr-${subdomain}-${reportId}`, json);

  // const json = await core.cache.load(`bamboohr-${subdomain}-${reportId}`);

  return json;
}

module.exports = {
  sync,
}