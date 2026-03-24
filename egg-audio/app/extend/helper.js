'use strict';

const request = require('../utils/request');

module.exports = {
  async request(options) {
    try {
      const result = await request(options);
      return result;
    } catch (error) {
      throw error;
    }
  },
};
