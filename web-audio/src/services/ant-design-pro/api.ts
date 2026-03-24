import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/user/info', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  const ret = await request<Record<string, any>>('/api/auth/logout', {
    method: 'POST',
    ...(options || {}),
  });
  localStorage.removeItem('token');
  return ret;
}

/** 登录接口 POST /api/auth/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      account: body.username,
      password: body.password,
    },
    ...(options || {}),
  });
}
