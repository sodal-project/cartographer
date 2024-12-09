import path from 'path';
import process from 'process';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  port: process.env.PORT || 3000,
  viewsPath: __dirname,
  publicPath: path.join(__dirname, "public"),
};