FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libssl-dev
RUN npm install -g nodemon
COPY ./package*.json ./
RUN npm install
COPY . .

# Define the startup command for the server
CMD ["npm", "start"]
