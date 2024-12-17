# Modules

Modules description here...

## Module Guidlines

- Only exported functions can be triggered by Core, these functions are considered public. Functions in a module that are not exported are considered private and cannot be triggered by core or other modules.

- Public module functions must return an interface so that the client can give the user some feedback on what's going on.

- Module interfaces should consist of a text string and a data object. Core will compile these using the handlebars templating engine before sending it back to the client.
