/**
 * @fileoverview Core type definitions for the persona graph system
 * @namespace Core
 * @description Types are accessed via Core.<TypeName>
 * Core provides type definitions for the persona graph system, including:
 * - Persona and relationship types
 * - Filter and query types
 * - Configuration and source types
 */

/**
 * @typedef {number} Core.Level
 * An integer control level from 1-12 representing relationship authority
 * 
 * Control Categories:
 * WILL (Physical Control):
 * - 1: Has physical control (POSSESS)
 * - 2: Has immediate authority (DIRECT)
 * - 3: Has indirect authority (GOVERN)
 * - 4: Introduces authority considerations (INFORM)
 * 
 * BE (Identity):
 * - 5: Is presentation of (ALIAS)
 * - 6: Causes to exist right now (REALIZE)
 * - 7: Establishes nature of being (DEFINE)
 * - 8: Communicates nature of being (DESCRIBE)
 * 
 * DO (Actions):
 * - 9: Unrestricted control (ADMIN)
 * - 10: Changes which personas can interact (MANAGE)
 * - 11: Causes interaction with other personas (ACT_AS)
 * - 12: Causes interaction with my persona (ACCESS)
 * 
 * @type {number}
 * @minimum 1
 * @maximum 12
 * @integer
 */

/**
 * @typedef {number} Core.Confidence
 * A confidence score between 0 and 1 indicating relationship reliability
 * 
 * Recommended confidence levels:
 * - 1.00 (MAX-SYSTEM): System declares relationship between personas it instantiates
 * - 0.75 (HIGH-PROVEN): Relationship exists with known details
 * - 0.50 (MEDIUM-ASSERTED): Relationship exists but details incomplete
 * - 0.25 (LOW-INFERRED): Relationship inferred from other data
 * - 0.01 (MIN-UNKNOWN): Speculative relationship
 * 
 * @type {number}
 * @minimum 0
 * @maximum 1
 */

/**
 * @typedef {string} Core.Platform
 * Platform identifier for a persona
 * Common platforms include: directory, bamboohr, email, google, github, slack
 * Custom platforms are allowed
 */

/**
 * @typedef {string} Core.Type
 * Type identifier for a persona
 * Common types include: participant, record, activity, account, workspace,
 * organization, orgunit, group, role, team, repo, channel
 * Custom types are allowed
 */

/**
 * @typedef {Object} Core.PersonaRelationship
 * A relationship entry in a persona's control/obey arrays
 * @property {string} upn - UPN of the related persona
 * @property {Core.Level} level - Control level (1-12)
 * @property {Core.Confidence} confidence - Confidence score (0-1)
 * @property {string} sid - Source declaring this relationship
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} Core.StoreRelationship
 * A relationship entry in a source store's persona.control map
 * @property {Core.Level} level - Control level (1-12)
 * @property {Core.Confidence} confidence - Confidence score (0-1)
 * @property {string} sid - Source declaring this relationship
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} Core.PersonaObject
 * A persona node with its relationships
 * @property {string} upn - Universal Persona Name (upn:<platform>:<type>:<id>)
 * @property {string} id - Platform-generated identifier
 * @property {Core.Platform} platform - Platform providing the account
 * @property {Core.Type} type - Persona type
 * @property {string} [friendlyName] - Optional display name
 * @property {Core.PersonaRelationship[]} [control] - Relationships where this persona has control
 * @property {Core.PersonaRelationship[]} [obey] - Relationships where this persona is controlled
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} Core.SourceStorePersona
 * A persona entry in a source store
 * @property {string} upn - Universal Persona Name
 * @property {string} id - Platform-generated identifier
 * @property {Core.Platform} platform - Platform name
 * @property {Core.Type} type - Persona type
 * @property {Object.<string, Core.StoreRelationship>} control - Map of controlled UPNs to relationship details
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} Core.FilterBase
 * Base interface for all filters
 * @property {string} type - Filter type identifier
 */

/**
 * @typedef {Object} Core.FieldFilter
 * @extends Core.FilterBase
 * Filter personas by field values
 * @property {'field'} type
 * @property {string} key - Field name
 * @property {string|number} value
 * @property {Core.PropertyOperator} operator
 * @property {boolean} [not] - Invert the filter
 */

/**
 * @typedef {string} Core.PropertyOperator
 * Valid property comparison operators that map to Neo4j
 * - Equality: '=', 'is', 'equals'
 * - Inequality: '≠', 'ne', '<>'
 * - Greater/Less: '>', 'gt', '<', 'lt', '>=', 'gte', '<=', 'lte'
 * - Text: 'contains', 'starts', 'startswith', 'startsWith', 'ends', 'endswith', 'endsWith'
 */

/**
 * @typedef {Object} Core.SourceFilter
 * @extends Core.FilterBase
 * Filter by source properties
 * @property {'source'} type
 * @property {'id'|'name'|'lastUpdate'} key
 * @property {string} value
 * @property {Core.PropertyOperator} operator
 * @property {boolean} [not] - Invert the filter
 */

/**
 * @typedef {Object} Core.AgencyFilter
 * @extends Core.FilterBase
 * Filter by control relationships
 * @property {'agency'} type
 * @property {'control'|'obey'} key - Relationship direction
 * @property {Core.FilterObject[]} [filter] - Sub-filters for related personas
 * @property {(number|string)[]} [levels] - Control levels or '*' for all
 * @property {number|[number,number]} [depth] - Relationship depth or [min,max] range
 * @property {{min: number, max: number}} [confidence] - Confidence range
 */

/**
 * @typedef {Object} Core.CompareFilter
 * @extends Core.FilterBase
 * Combine results with other filters
 * @property {'compare'} type
 * @property {'in'|'not'|'or'} key - Comparison operation
 * @property {Core.FilterObject[]} filter - Sub-filters to compare against
 */

/**
 * @typedef {Object} Core.SetFilter
 * @extends Core.FilterBase
 * Filter by explicit UPN set
 * @property {'set'} type
 * @property {string[]} upns - Array of UPNs to match
 */

/**
 * @typedef {(Core.FieldFilter|Core.SourceFilter|Core.AgencyFilter|Core.CompareFilter|Core.SetFilter)} Core.FilterObject
 */

/**
 * @typedef {Object} Core.FilterParams
 * Sort and pagination parameters
 * @property {string} [field='upn'] - Field to sort by
 * @property {'ASC'|'DESC'} [direction='ASC'] - Sort direction
 * @property {number} [pageNum=1] - Page number
 * @property {number} [pageSize=500] - Results per page
 */ 