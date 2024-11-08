const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  viewsPath: __dirname,
  publicPath: path.join(__dirname, "public"),
};