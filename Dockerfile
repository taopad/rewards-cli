FROM node:20
COPY . /cli
WORKDIR /cli
RUN npm install
ENTRYPOINT ["npm", "run"]
