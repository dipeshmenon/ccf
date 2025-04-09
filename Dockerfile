FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy Yarn config files first
COPY .yarn .yarn
COPY .yarnrc.yml ./
COPY package.json yarn.lock ./

# Ensure the packages exist before copying
COPY packages/api/package.json packages/api/
COPY packages/client/package.json packages/client/
COPY packages/cli/package.json packages/cli/

# Set the node linker explicitly (to be extra sure)
ENV YARN_NODE_LINKER=node-modules

# Install dependencies
RUN yarn install

# Copy the entire project
COPY . .

# Expose dynamic ports for frontend and backend
EXPOSE 3000 4000

# Start the application
CMD ["yarn", "start"]

