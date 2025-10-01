# ---- 1. Build Stage ----
# In this stage, we install all dependencies (including devDependencies)
# and build the TypeScript source code into JavaScript.
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install all dependencies
RUN yarn install

# Copy the rest of the source code
COPY . .

# Build the project
RUN yarn build

# ---- 2. Production Stage ----
# In this stage, we start from a fresh, clean Node.js image
# and copy only the necessary files for running the application.
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install ONLY production dependencies
RUN yarn install --production

# Copy the built output from the builder stage
COPY --from=builder /usr/src/app/build ./build

# Expose the port the app runs on
EXPOSE 2567

# The command to run the application
CMD [ "node", "build/src/index.js" ]
