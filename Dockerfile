FROM node:20-alpine

WORKDIR /app

COPY package.json /app/package.json

# Install dependencies (EJS + Express). This layer is cached when package.json is unchanged.
RUN npm install --omit=dev

COPY server/ /app/server/
COPY views/ /app/views/
COPY site/assets/ /app/site/assets/
COPY *.pdf /app/

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]


