# Components

Components description here...

## Module Guidlines

- Components cannot contain the Alpine js attribute "x-ref" unless they also include a parent "x-data" attribute. Without this the "x-ref" attribute has no scope and will trigger the error: "Uncaught TypeError: Cannot read properties of undefined (reading '_x_refs')". This error will only be triggered if the x-ref element has no parent level element with "x-data".
