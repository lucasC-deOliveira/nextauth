import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { signOut } from '../contexts/AuthContext';

interface AxiosErrorResponse {
  code?: string;
}


let isRefreshing = false;

let failedRequestsQueue = []

export function setupApiClient(ctx = undefined) {
  let cookies = parseCookies(ctx)

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(response => {
    return response
  }, (error: AxiosError<AxiosErrorResponse>) => {
    if (error.response.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        cookies = parseCookies(ctx)

        const { 'nextauth.refreshToken': refreshToken } = cookies
        // console.log('token', refreshToken)
        const originalConfig = error.config

        if (!isRefreshing) {

          isRefreshing = true;

          api.post('/refresh', {
            refreshToken,
          }).then(response => {

            const { token } = response.data;

            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: "/"
            })

            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: "/"
            })

            api.defaults.headers['Authorization'] = `Bearer ${token}`

            failedRequestsQueue.forEach(request => {
              request.onSuccess(token)
            })

            failedRequestsQueue = []

          }).catch((err) => {
            failedRequestsQueue.forEach(request => {
              request.onFailed(err)
            })

            failedRequestsQueue = []

            if (process.browser) {
              signOut()
            }

          }).finally(() => {
            isRefreshing = false;
          })
        }
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`

              resolve(api(originalConfig))
            },
            onFailed: (err: AxiosError<AxiosErrorResponse>) => {
              reject(err)
            }
          })
        })

      }
      else {
        if (process.browser) {
          signOut()
        }

      }
    }
    return Promise.reject(error);
  })


  return api
}