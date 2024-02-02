FROM node:18
COPY . /cli
WORKDIR /cli
RUN npm install
ENTRYPOINT ["npm", "run"]
