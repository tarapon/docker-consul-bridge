FROM node:8.4.0
MAINTAINER tarapon@gmail.com

ADD ./src /source/src
ADD ./package.json /source/
ADD ./yarn.lock /source/
ADD ./entrypoint.sh /

WORKDIR /source
RUN chmod +x /entrypoint.sh src/boot.js
RUN cd /source && yarn install

ENTRYPOINT ["/entrypoint.sh"]
