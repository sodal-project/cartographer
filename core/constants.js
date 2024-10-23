const LEVEL = {
  "POSSESS": 1,   // WILL has physical control
  "DIRECT": 2,    // WILL has immediate authority
  "GOVERN": 3,    // WILL has indirect authority
  "INFORM": 4,     // WILL introduce authority considerations [UNUSED IN V1]
  "ALIAS": 5,      // BE is presentation of
  "REALIZE": 6,    // BE cause to exist right now
  "DEFINE": 7,     // BE establish nature of being
  "DESCRIBE": 8,   // BE communicate nature of being [UNUSED IN V1]
  "ADMIN": 9,      // DO unrestricted control
  "MANAGE": 10,     // DO change which personas can interact
  "ACT_AS": 11,     // DO cause to interact with other personas
  "ACCESS": 12,     // DO cause to interact with my persona [UNUSED IN V1]  
}

const CONFIDENCE = {
  "MAX-SYSTEM": 1,
  "HIGH-PROVEN": .75,
  "MEDIUM-ASSERTED": .5,
  "LOW-INFERRED": .25,
  "MIN-UNKNOWN": .01,
}

const PLATFORM = {
  "DIRECTORY": "directory",   // Cartographer app data (Participants, Activities, etc.)
  "BAMBOOHR": "bamboohr",
  "EMAIL": "email",     
  "GOOGLE": "google",    
  "GITHUB": "github",    
  "SLACK": "slack",
}

const TYPE = {
  "PARTICIPANT": "participant",   // a directory reference to a human being
  "RECORD": "record",             // a platform's reference to a human being; records map indirect control to other personas (the record describes but does not grant agency)
  "ACTIVITY": "activity",                     // a group of humans working together
  "ACCOUNT": "account",
  "AUTH": "auth",
  "WORKSPACE": "workspace",
  "ORGANIZATION": "organization",
  "ORGUNIT": "orgunit",
  "GROUP": "group",
  "ROLE": "role",
  "TEAM": "team",
  "REPO": "repo",
  "CHANNEL": "channel",  
}

module.exports = {
  LEVEL,
  CONFIDENCE,
  PLATFORM,
  TYPE
}
