# Build stage
FROM node:20 AS build
WORKDIR /client
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Run stage
FROM node:20
WORKDIR /client
RUN npm install -g serve
COPY --from=build /client/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]