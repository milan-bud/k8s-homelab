# Use a slim version of Node for a smaller image size
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copying package files first leverages Docker cache
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose the port your express app is running on
EXPOSE 3000

# Use a non-root user for better security in K8s
USER node

CMD [ "node", "server.js" ]
