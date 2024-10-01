FROM node:18-slim
WORKDIR /app
RUN npm install -g nodemon
COPY ./package*.json ./
RUN npm install
COPY . .

# Define the startup command for the server
CMD ["npm", "start"]
