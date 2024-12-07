/**
 * @fileoverview Core type definitions for the persona graph system
 * @description 
 * Core provides type definitions for the persona graph system, including:
 * - Persona and relationship types
 * - Filter and query types
 * - Configuration and source types
 */

/**
 * @typedef {number} ControlLevel
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
 * @typedef {number} ControlConfidence
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
 * @typedef {string} PersonaPlatform
 * Platform identifier for a persona
 * Common platforms include: directory, bamboohr, email, google, github, slack
 * Custom platforms are allowed
 */

/**
 * @typedef {string} PersonaType
 * Type identifier for a persona
 * Common types include: participant, record, activity, account, workspace,
 * organization, orgunit, group, role, team, repo, channel
 * Custom types are allowed
 */

/**
 * @typedef {Object} PersonaRelationship
 * A relationship entry in a persona's control/obey arrays
 * @property {string} upn - UPN of the related persona
 * @property {ControlLevel} level - Control level (1-12)
 * @property {ControlConfidence} confidence - Confidence score (0-1)
 * @property {string} sid - Source declaring this relationship
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} StoreRelationship
 * A relationship entry in a source store's persona.control map
 * @property {ControlLevel} level - Control level (1-12)
 * @property {ControlConfidence} confidence - Confidence score (0-1)
 * @property {string} sid - Source declaring this relationship
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} PersonaObject
 * A persona node with its relationships
 * @property {string} upn - Universal Persona Name (upn:<platform>:<type>:<id>)
 * @property {string} id - Platform-generated identifier
 * @property {PersonaPlatform} platform - Platform providing the account
 * @property {PersonaType} type - Persona type
 * @property {string} [friendlyName] - Optional display name
 * @property {PersonaRelationship[]} [control] - Relationships where this persona has control
 * @property {PersonaRelationship[]} [obey] - Relationships where this persona is controlled
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} SourceStoreObject
 * A source store object containing all source data
 * @property {SourceObject} source - The source object
 * @property {SourceStorePersona[]} personas - Array of persona objects
 */

/**
 * @typedef {Object} SourceStorePersona
 * A persona entry in a source store
 * @property {string} upn - Universal Persona Name
 * @property {string} id - Platform-generated identifier
 * @property {PersonaPlatform} platform - Platform name
 * @property {PersonaType} type - Persona type
 * @property {Object.<string, StoreRelationship>} control - Map of controlled UPNs to relationship details
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} FilterBase
 * Base interface for all filters
 * @property {string} type - Filter type identifier
 */

/**
 * @typedef {Object} FieldFilter
 * @extends FilterBase
 * Filter personas by field values
 * @property {'field'} type - Filter type identifier
 * @property {string} key - Field name to filter on
 * @property {string|number} value - Value to compare against
 * @property {PropertyOperator} operator - Comparison operator
 * @property {boolean} [not] - Invert the filter condition
 * @example
 * // Find personas with name containing "John"
 * {
 *   type: 'field',
 *   key: 'name',
 *   value: 'John',
 *   operator: 'contains'
 * }
 */

/**
 * @typedef {string} PropertyOperator
 * Valid property comparison operators that map to Neo4j
 * - Equality: '=', 'is', 'equals'
 * - Inequality: '≠', 'ne', '<>'
 * - Greater/Less: '>', 'gt', '<', 'lt', '>=', 'gte', '<=', 'lte'
 * - Text: 'contains', 'starts', 'startswith', 'startsWith', 'ends', 'endswith', 'endsWith'
 */

/**
 * @typedef {Object} SourceFilter
 * @extends FilterBase
 * Filter by source properties
 * @property {'source'} type - Filter type identifier
 * @property {'id'|'name'|'lastUpdate'} key - Source field to filter on
 * @property {string} value - Value to compare against
 * @property {PropertyOperator} operator - Comparison operator
 * @property {boolean} [not] - Invert the filter condition
 * @example
 * // Find personas from sources updated after Jan 1, 2024
 * {
 *   type: 'source',
 *   key: 'lastUpdate',
 *   value: '2024-01-01',
 *   operator: '>'
 * }
 */

/**
 * @typedef {Object} AgencyFilter
 * @extends FilterBase
 * Filter by control relationships
 * @property {'agency'} type - Filter type identifier
 * @property {'control'|'obey'} key - Direction of relationship
 * @property {FilterObject[]} [filter] - Sub-filters for related personas
 * @property {(number|string)[]} [levels] - Control levels or '*' for all
 * @property {number|[number,number]} [depth] - Relationship depth or [min,max] range
 * @property {{min: number, max: number}} [confidence] - Confidence range
 * @example
 * // Find personas controlled by "john.doe" with high confidence
 * {
 *   type: 'agency',
 *   key: 'obey',
 *   levels: [1, 2],  // Level 1 and 2 relationships
 *   depth: [1, 3],   // Between 1 and 3 hops
 *   confidence: { min: 0.8, max: 1.0 },
 *   filter: [{
 *     type: 'field',
 *     key: 'upn',
 *     value: 'john.doe',
 *     operator: 'contains'
 *   }]
 * }
 */

/**
 * @typedef {Object} CompareFilter
 * @extends FilterBase
 * Combine results with other filters
 * @property {'compare'} type - Filter type identifier
 * @property {'in'|'not'|'or'} key - Comparison operation
 * @property {FilterObject[]} filter - Sub-filters to compare against
 * @example
 * // Find personas NOT in the engineering department
 * {
 *   type: 'compare',
 *   key: 'not',
 *   filter: [{
 *     type: 'field',
 *     key: 'department',
 *     value: 'engineering',
 *     operator: '='
 *   }]
 * }
 */

/**
 * @typedef {Object} SetFilter
 * @extends FilterBase
 * Filter by explicit UPN set
 * @property {'set'} type - Filter type identifier
 * @property {string[]} upns - Array of UPNs to match
 * @example
 * // Find personas from a specific set of UPNs
 * {
 *   type: 'set',
 *   upns: [
 *     'upn:email:account:john.doe@example.com',
 *     'upn:email:account:jane.smith@example.com'
 *   ]
 * }
 */

/**
 * @typedef {(FieldFilter|SourceFilter|AgencyFilter|CompareFilter|SetFilter)} FilterObject
 * Individual filter object - must be one of the defined filter types
 * @example
 * // Combined filter example: Find active personas in engineering
 * [
 *   {
 *     type: 'field',
 *     key: 'status',
 *     value: 'active',
 *     operator: '='
 *   },
 *   {
 *     type: 'field',
 *     key: 'department',
 *     value: 'engineering',
 *     operator: '='
 *   }
 * ]
 */

/**
 * @typedef {Object} FilterParams
 * Sort and pagination parameters
 * @property {string} [field='upn'] - Field to sort by
 * @property {'ASC'|'DESC'} [direction='ASC'] - Sort direction
 * @property {number} [pageNum=1] - Page number
 * @property {number} [pageSize=500] - Results per page
 */

/**
 * @typedef {Object} GraphFilterResponse
 * Response from a graph database filter query
 * @property {Object[]} raw - Raw query results
 * @property {PersonaObject[]} personas - Processed persona objects
 * @property {string[]} upns - Universal Persona Names
 * @property {number} currentCount - Number of matching personas
 * @property {number} totalCount - Total personas matching filter
 * @property {number} time - Query execution time in ms
 */

/**
 * @typedef {Object} QuerySet
 * A Neo4j query and its parameters
 * @property {string} query - Cypher query string
 * @property {Object} values - Parameters for the query
 * @property {boolean} [readOnly=false] - Whether this is a read-only query
 * @property {string} [description] - Human-readable description of what the query does
 * @example
 * {
 *   query: "MATCH (n:Person {name: $name}) RETURN n",
 *   values: { name: "John" },
 *   readOnly: true,
 *   description: "Find person by name"
 * }
 */

/**
 * @typedef {Object} SourceObject
 * A source node in the graph database
 * @property {string} sid - Source identifier
 * @property {string} name - Source display name
 * @property {number} lastUpdate - Last update timestamp
 * @property {Object.<string, any>} [customProps] - Additional properties
 */

/**
 * @typedef {Object} GraphResponse
 * Response from a graph database operation
 * @property {Object[]} records - Raw Neo4j records
 * @property {Object} summary - Query summary information
 * @property {number} time - Query execution time in ms
 */

/**
 * @typedef {Object} GraphBatchResponse
 * Response from a batch of graph operations
 * @property {GraphResponse[]} responses - Array of individual query responses
 * @property {number} totalTime - Total execution time in ms
 */ 