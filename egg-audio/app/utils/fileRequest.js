const axios = require('axios');

class Request {
  constructor(config = {}) {
    this.instance = axios.create({
      baseURL: process.env.FILE_BASE_URL,
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
    
    // 添加 token 缓存
    this.accessToken = null;
  }

  authorization(sessionId) {
    this.instance.defaults.headers.common.Cookie = `JSESSIONID=${sessionId}`;
  }
  
  // 设置 authorization token
  setToken(token) {
    this.accessToken = token;
    this.instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
  
  // 获取当前缓存的 token
  getToken() {
    return this.accessToken;
  }

  async get(url, config = {}) {
    try {
      console.debug('GET Request:', { url, config });
      const response = await this.instance.get(url, config);
      console.debug('GET Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('file requestGET Error:', process.env.FILE_BASE_URL, error);
      // 如果是 401 错误，则抛出特定的错误对象，包含状态码
      if (error.response && error.response.status === 401) {
        const authError = new Error('Unauthorized');
        authError.status = 401;
        throw authError;
      }
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
      console.error('file requestPOST Error:', process.env.FILE_BASE_URL, error);
      // 如果是 401 错误，则抛出特定的错误对象，包含状态码
      if (error.response && error.response.status === 401) {
        const authError = new Error('Unauthorized');
        authError.status = 401;
        throw authError;
      }
      throw error;
    }
  }
}

module.exports = new Request();
