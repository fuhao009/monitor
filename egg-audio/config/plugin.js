const path = require('path');

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  cors: {
    enable: true,
    path: path.join(__dirname, '../plugins/cors'),
  },
  knex: {
    enable: true,
    path: path.join(__dirname, '../plugins/knex'),
  },
  validate: {
    enable: true,
    path: path.join(__dirname, '../plugins/validate'),
  },
};
