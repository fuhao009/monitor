const axios = require('axios');

class Request {
  constructor(config = {}) {
    this.instance = axios.create({
      baseURL: process.env.BASE_URL,
      timeout: 5000,
      withCredentials: true,
      ...config,
      // 添加跨域支持和 xhrFields 配置
      headers: {
        ...config.headers,
        'X-Requested-With': 'XMLHttpRequest', // 强制设置为 XMLHttpRequest 请求
      },
      // 添加跨域相关配置
      xhrFields: {
        withCredentials: true,
      },
      crossDomain: true,
    });
  }

  setSessionId(sessionId) {
    this.instance.defaults.headers.common.Cookie = `JSESSIONID=${sessionId}`;
  }

  async get(url, config = {}) {
    try {
      console.debug('GET Request:', { url, config });
      const response = await this.instance.get(url, config);
      console.debug('GET Response:', response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post(url, data = {}, config = {}) {
    try {
      console.debug('POST Request:', { url, data, config });
      const response = await this.instance.post(url, data, config);
      console.debug('POST Response:', response.data);
      return response.data;
    } catch (error) {
      console.debug('POST Error:', error);
      throw error;
    }
  }
}

module.exports = new Request();
