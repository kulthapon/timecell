# Build stage
FROM node:20 AS build
WORKDIR /client
COPY package*.json ./
RUN npm install
COPY . .
<<<<<<< Updated upstream
=======

# docker-compose build args
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AI_URL=$REACT_APP_AI_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL

>>>>>>> Stashed changes
RUN npm run build

# Run stage
FROM node:20
WORKDIR /client
RUN npm install -g serve
COPY --from=build /client/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]