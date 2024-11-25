const core = require('../../core/core');
const { deleteOrphanedPersonas } = require('../../core/graph');
const LEVEL = core.constants.LEVEL;

async function sync(instance){
  try {
    console.log('Syncing BambooHR Instance: ', instance.name);

    const instanceId = instance.id;
    const orgName = instance.name;
    const token = await core.crypto.decrypt(instance.secret);
    const subdomain = instance.subdomain;
    const reportId = instance.reportId;

    const source = core.source.getSourceObject('bamboohr', instanceId, orgName);

    const records = await apiCall(subdomain, reportId, token);
    const employees = records.employees;

    const personas = [];
    const orgPersona = getOrgPersona(orgName);
    personas.push(orgPersona);

    const foundDepartments = [];

    const supervisorLookup = employees.reduce((lookup, employee) => {
      if(employee.firstName && employee.lastName) {
        const supervisorString = `${employee.firstName} ${employee.lastName}`;
        lookup[supervisorString] = employee.employeeNumber;
      }
      return lookup;
    }, {});

    employees.forEach(employee => {
      const department = employee.department;
      const division = employee.division;
  
      // create department and division personas if they don't exist
      if(department && division) {
        if(!foundDepartments.includes(department)) {
          const deptPersona = getDeptPersona(department, division, orgName);
          const divPersona = getDivPersona(division, orgName);
          personas.push(deptPersona);
          personas.push(divPersona);
          foundDepartments.push(department);
        }
      }
      const empPersona = getEmployeePersona(employee, department, division, orgName);
      if(empPersona) {
        if(employee["91"]) {
          const supervisorId = supervisorLookup[employee["91"]];
          if(supervisorId) {
            const supervisorUpn = `upn:bamboohr:participant:${supervisorId}@${orgPersona.id}`;
            empPersona.obey.push({
              upn: supervisorUpn,
              confidence: .75,
              level: LEVEL["DIRECT"]
            });
          }
        }
        personas.push(empPersona);
      }
    });

    await core.cache.save(`bamboohr-${subdomain}-${reportId}-personas`, personas);
    await core.graph.syncPersonas(personas, source);

    return `BambooHR instance synced: ${orgName}`;
  } catch (error) {
    return `Error syncing BambooHR instance: ${error.message}`;
  }
}

function getEmployeePersona(employee, department, division, orgName) {
  if(!employee.fullName2) {
    console.error('Employee missing name: ', employee.id);
    return;
  }

  const orgPersona = getOrgPersona(orgName);
  const empId = `${employee.employeeNumber}@${orgPersona.id}`; // employee@organization
  const empUpn = `upn:bamboohr:participant:${empId}`;

  const empPersona = {
    upn: empUpn,
    id: empId,
    platform: 'bamboohr',
    type: 'participant',
    subtype: 'employee',
    name: employee.fullName2,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeStatusDate: employee.employeeStatusDate,
    employmentHistoryStatus: employee.employmentHistoryStatus,
    employeeNumber: employee.employeeNumber,
    terminationType: employee["4313"],
    supervisor: employee["91"],
    control: [],
    obey: [],
  }

  if(employee.homeEmail) {
    const emailPersona = getEmailPersona(employee.homeEmail);
    empPersona.control.push({
      upn: emailPersona.upn,
      confidence: .75,
      level: LEVEL["ADMIN"]
    })
  }

  // if the employee is not Terminated, add to org
  if(employee.employmentHistoryStatus !== 'Terminated') {
    empPersona.control.push({
      upn: orgPersona.upn,
      confidence: .75,
      level: LEVEL["ACT_AS"]
    });
    empPersona.obey.push({
      upn: orgPersona.upn,
      confidence: .75,
      level: LEVEL["DIRECT"]
    });

    if(department && division) {
      const deptPersona = getDeptPersona(department, division, orgName);
      empPersona.control.push({
        upn: deptPersona.upn,
        confidence: .75,
        level: LEVEL["ACT_AS"]
      });
      empPersona.obey.push({
        upn: deptPersona.upn,
        confidence: .75,
        level: LEVEL["DIRECT"]
      });
    }

    if(employee.workEmail) {
      const emailPersona = getEmailPersona(employee.workEmail);
      empPersona.control.push({
        upn: emailPersona.upn,
        confidence: .75,
        level: LEVEL["ADMIN"]
      })
    }
  }

  return empPersona;
}

function getEmailPersona(email) {
  const emailId = email.toLowerCase();
  return {
    upn: `upn:email:account:${emailId}`,
    id: emailId,
    name: email,
    platform: 'email',
    type: 'account',
    control: [],
    obey: [],
  }
}

function getDeptPersona(department, division, org) {
  const orgId = idString(org);
  const divId = `${idString(division)}@${orgId}`;    // division@organization
  const deptId = `${idString(division)}-${idString(department)}@${orgId}`; // division-department@organization

  const divUpn = `upn:bamboohr:activity:${divId}`;
  const deptUpn = `upn:bamboohr:activity:${deptId}`;

  return {
    upn: deptUpn,
    id: deptId,
    name: department,
    platform: 'bamboohr',
    type: 'activity',
    subtype: 'department',
    control: [
      {
        upn: divUpn,
        confidence: .75,
        level: LEVEL["ACT_AS"]
      },
    ],
    obey: [
      {
        upn: divUpn,
        confidence: .75,
        level: LEVEL["DIRECT"]
      }
    ]
  }
}

function getDivPersona(division, orgName){
  const orgPersona = getOrgPersona(orgName);
  const divId = `${idString(division)}@${orgPersona.id}`; // division@organization
  const divUpn = `upn:bamboohr:activity:${divId}`;

  return {
    upn: divUpn,
    id: divId,
    name: division,
    platform: 'bamboohr',
    type: 'activity',
    subtype: 'division',
    control: [
      {
        upn: orgPersona.upn,
        confidence: .75,
        level: LEVEL["ACT_AS"]
      }
    ],
    obey: [
      {
        upn: orgPersona.upn,
        confidence: .75,
        level: LEVEL["DIRECT"]
      }
    ]
  }
}

function getOrgPersona(orgName) {
  const orgId = idString(orgName);
  const orgUpn = `upn:bamboohr:activity:${orgId}`;
  return {
    upn: orgUpn,
    id: orgId,
    name: orgName,
    platform: 'bamboohr',
    type: 'activity',
    subtype: 'organization',
    control: [],
    obey: [],
  }
}

async function apiCall(subdomain, reportId, token) {

  let json = await core.cache.load(`bamboohr-${subdomain}-${reportId}`);
  if(json) {
    return json;
  }

  const url = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/reports/${reportId}?format=JSON&onlyCurrent=true`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "Authorization": "Basic " + btoa(token + ":x"),
      "Accept": "application/json",
    }
  });
  json = await response.json();

  await core.cache.save(`bamboohr-${subdomain}-${reportId}`, json);
  return json;
}

function idString(str) {
  // return lowercase with no spaces or special characters
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
} 

module.exports = {
  sync,
}