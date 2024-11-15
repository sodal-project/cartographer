/**
 * Relationship Levels
 * 
 * REQUIRED relationship levels for personas
 * Relationships must have a single level from this list
 * 
 * @readonly
 */

const LEVEL = {
  1: 1,           // WILL has physical control
  "1": 1,
  "POSSESS": 1,
  "possess": 1,
  2: 2,           // WILL has immediate authority
  "2": 2,
  "DIRECT": 2,
  "direct": 2,
  3: 3,           // WILL has indirect authority
  "3": 3,
  "GOVERN": 3,
  "govern": 3,
  4: 4,           // WILL introduce authority considerations [UNUSED IN V1]
  "4": 4,
  "INFORM": 4,
  "inform": 4,
  5: 5,           // BE is presentation of
  "5": 5,
  "ALIAS": 5,
  "alias": 5,
  6: 6,           // BE cause to exist right now
  "6": 6,
  "REALIZE": 6,
  "realize": 6,
  7: 7,           // BE establish nature of being
  "7": 7,
  "DEFINE": 7,
  "define": 7,
  8: 8,           // BE communicate nature of being [UNUSED IN V1]
  "8": 8,
  "DESCRIBE": 8,
  "describe": 8,
  9: 9,           // DO unrestricted control
  "9": 9,
  "ADMIN": 9,
  "admin": 9,
  10: 10,         // DO change which personas can interact
  "10": 10,
  "MANAGE": 10,
  11: 11,         // DO cause to interact with other personas
  "11": 11,
  "ACT_AS": 11,
  "act_as": 11,
  "ACTAS": 11,
  "actas": 11,
  12: 12,         // DO cause to interact with my persona [UNUSED IN V1]  
  "12": 12,
  "ACCESS": 12,
  "access": 12,
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
