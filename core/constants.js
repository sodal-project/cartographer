/**
 * Relationship Levels
 * 
 * REQUIRED relationship levels for personas
 * Relationships must have a single level from this list
 * 
 * @readonly
 */
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

/**
 * Relationship Confidence
 * 
 * Relationships must have a any confidance value ranging from 0 to 1
 * The score below are default values
 * 
 * MAX-SYSTEM = A system declares the relationship between two personas that it instantiates (highest system-level confidence)
 * HIGH-PROVEN = The relationship is known to exist, and all details are known (highest human-level confidence)
 * MEDIUM-ASSERTED = The relationship is known to exist, but not all relationship details are available
 * LOW-INFERRED = The relationship is assumed to exist from other data, but the relationship is not directly observed
 * MIN-UNKNOWN = The relationship is speculative
 * 
 * @readonly
 */
const CONFIDENCE = {
  "MAX-SYSTEM": 1,
  "HIGH-PROVEN": .75,
  "MEDIUM-ASSERTED": .5,
  "LOW-INFERRED": .25,
  "MIN-UNKNOWN": .01,
}

/**
 * Platform Types
 * 
 * OPTIONAL platform types for personas
 * Personas may have platform types not listed here
 * 
 * @readonly
 */
const PLATFORM = {
  "DIRECTORY": "directory",   // Cartographer app data (Participants, Activities, etc.)
  "BAMBOOHR": "bamboohr",
  "EMAIL": "email",     
  "GOOGLE": "google",    
  "GITHUB": "github",    
  "SLACK": "slack",
}

/**
 * Persona Types
 * 
 * OPTIONAL persona types for personas
 * Personas may have types not listed here
 * The meaning of each type is platform-specific
 * 
 * @readonly
 */
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
