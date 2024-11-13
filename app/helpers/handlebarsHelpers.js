const Handlebars = require('handlebars');

/**
 * Add custom Handlebars helpers here.
 */

/**
 * Compares two values for strict equality.
 *
 * @param {*} a - The first value to compare.
 * @param {*} b - The second value to compare.
 * @returns {boolean} - True if the values are strictly equal, otherwise false.
 *
 * @example
 * // Handlebars template:
 * {{#if (eq userRole "admin")}}
 *   <p>Welcome, Admin!</p>
 * {{else}}
 *   <p>Welcome, User!</p>
 * {{/if}}
 *
 * // Data:
 * { userRole: "admin" }
 *
 * // Rendered output:
 * <p>Welcome, Admin!</p>
 */
const eq = (a, b) => a === b;

/**
 * Adds two numbers together.
 *
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} - The sum of the two numbers.
 *
 * @example
 * // Handlebars template:
 * <p>The total is: {{add price tax}}</p>
 *
 * // Data:
 * { price: 50, tax: 5 }
 *
 * // Rendered output:
 * <p>The total is: 55</p>
 */
const add = (a, b) => a + b;

/**
 * Include a partial inside of another partial
 * 
 * @param {*} partialName - The name of the partial to include
 * @param {*} data - The data to pass to the partial
 * @returns - A rendred version of the partial
 * 
 * @example
 * // Handlebars template:
 * <div>{{dynamicPartial this.component this.data }}</div>
 * 
 * // Data:
 * { component: 'subpane', data: { key: 'value' }}
 * 
 * // Rendered output:
 * <div>Subpane content with value</div>
 */
const dynamicPartial = (partialName, data) => {
  // Look up the partial
  let partial = Handlebars.partials[partialName];

  // Check if the partial is a string (not compiled)
  if (typeof partial === 'string') {
    partial = Handlebars.compile(partial);
  }

  if (typeof partial === 'function') {
    return new Handlebars.SafeString(partial(data));
  }

  return ''; // Return an empty string if the partial isn't found or valid
};


module.exports = {
  eq,
  add,
  dynamicPartial,
};
