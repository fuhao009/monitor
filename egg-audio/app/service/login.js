const Service = require('egg').Service;
const crypto = require('crypto');
const request = require('../utils/request');
const fileRequest = require('../utils/fileRequest');
class LoginService extends Service {
  async getRandomAndSession() {
    const result = await request.get('/ptt/random');
    const { random, sessionId } = result.data;
    request.setSessionId(sessionId);
    return { random, sessionId };
  }

  encryptPassword(password, random) {
    // 第一步：计算密码的 SHA1
    const sha1Password = crypto.createHash('sha1')
      .update(Buffer.from(password))
      .digest('hex');

    // 第二步：计算 HMAC-SHA1
    return crypto.createHmac('sha1', random)
      .update(sha1Password)
      .digest('hex');
  }

  async login(ctx) {
    const account = process.env.ACCOUNT;
    const password = process.env.PASSWORD;

    try {
      // 获取随机数和会话ID
      const { random, sessionId } = await this.getRandomAndSession();

      // 加密密码
      const encryptedPassword = this.encryptPassword(password, random);

      // 调用登录接口
      const loginResult = await request.get('/ptt/organization', {
        params: {
          method: 'login',
          account,
          pwd: encryptedPassword,
          timeZoneOffset: -480,
        },
      });

      return { ...loginResult, sessionId };
    } catch (error) {
      throw error;
    }
  }
  async fileLogin(ctx) {
    // const username = process.env.FILE_ACCOUNT;
    // const password = process.env.FILE_PASSWORD;
    const username = ctx.user?.linked_account;
    const password = ctx.user?.linked_password;

    if (!username) {
      throw new Error('关联账号为空')
    }
    if (!password) {
      throw new Error('关联账号的密码为空')
    }

    try {
      // 调用登录接口
      const loginResult = await fileRequest.post('/v1/auth/login', {
        username,
        password,
      });

      return { ...loginResult };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = LoginService;