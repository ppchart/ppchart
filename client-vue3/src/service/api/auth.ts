import { request } from '../request';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  // return request<Api.Auth.LoginToken>({
  //   url: '/auth/login',
  //   method: 'post',
  //   data: {
  //     userName,
  //     password
  //   }
  // });
  return new Promise<App.Service.Response<Api.Auth.LoginToken>>((resolve) => {
    resolve({
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjpbeyJ1c2VyTmFtZSI6IlNveWJlYW4ifV0sImlhdCI6MTY5ODQ4NDg2MywiZXhwIjoxNzMwMDQ0Nzk5LCJhdWQiOiJzb3liZWFuLWFkbWluIiwiaXNzIjoiU295YmVhbiIsInN1YiI6IlNveWJlYW4ifQ._w5wmPm6HVJc5fzkSrd_j-92d5PBRzWUfnrTF1bAmfk",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjpbeyJ1c2VyTmFtZSI6IlNveWJlYW4ifV0sImlhdCI6MTY5ODQ4NDg4MSwiZXhwIjoxNzYxNTgwNzk5LCJhdWQiOiJzb3liZWFuLWFkbWluIiwiaXNzIjoiU295YmVhbiIsInN1YiI6IlNveWJlYW4ifQ.7dmgo1syEwEV4vaBf9k2oaxU6IZVgD2Ls7JK1p27STE"
      },
      "code": "0000",
      "msg": "请求成功"
    })
  })
}

/** Get user info */
export function fetchGetUserInfo() {
  // return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
  return new Promise<App.Service.Response<Api.Auth.UserInfo>>((resolve) => {
    resolve({
      "data": {
        "userId": "0",
        "userName": "PPChart",
        "roles": [
          "R_SUPER"
        ],
        "buttons": [
          "B_CODE1",
          "B_CODE2",
          "B_CODE3"
        ]
      },
      "code": "0000",
      "msg": "请求成功"
    })
  })
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
