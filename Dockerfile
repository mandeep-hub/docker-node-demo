
FROM node:22

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY app.js .

EXPOSE 3000

CMD ["node", "app.js"]
