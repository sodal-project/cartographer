/**
 * @fileoverview Constants and enumerations for the persona graph system
 * @module Core/constants
 */

/** @typedef {import('./types').ControlLevel} ControlLevel */
/** @typedef {import('./types').ControlConfidence} ControlConfidence */

/**
 * Control level mappings
 * Maps string representations to their numeric values (1-12)
 * @type {Object.<string|number, ControlLevel>}
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
 * Standard confidence levels for relationships
 * @type {Object.<string, ControlConfidence>}
 */
const CONFIDENCE = {
  "MAX-SYSTEM": 1,
  "HIGH-PROVEN": 0.75,
  "MEDIUM-ASSERTED": 0.5,
  "LOW-INFERRED": 0.25,
  "MIN-UNKNOWN": 0.01,
}

/**
 * Standard platform types
 * Note: Custom platform types are allowed
 * @type {Object.<string, string>}
 */
const PLATFORM = {
  "DIRECTORY": "directory",
  "BAMBOOHR": "bamboohr",
  "EMAIL": "email",     
  "GOOGLE": "google",    
  "GITHUB": "github",    
  "SLACK": "slack",
}

/**
 * Standard persona types
 * Note: Custom types are allowed and type meanings are platform-specific
 * @type {Object.<string, string>}
 */
const TYPE = {
  "PARTICIPANT": "participant",
  "RECORD": "record",
  "ACTIVITY": "activity",
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
