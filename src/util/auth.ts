import { IUserInfo } from 'src/util/types';
import { FastifyRequest } from 'fastify';

function decodeBase64(base64Str: string) {
  try {
    return Buffer.from(base64Str, 'base64').toString('utf8');
  } catch (e) {
    return null;
  }
}

type ExtraHeaders = {
  'x-userinfo'?: string;
};

export function getUserInfo(request: FastifyRequest): IUserInfo {
  try {
    const { 'x-userinfo': userInfoBase64 } = request.headers as ExtraHeaders;

    if (!userInfoBase64) {
      return {};
    }

    const userInfoJsonStr = decodeBase64(userInfoBase64);
    if (!userInfoJsonStr) {
      return {};
    }

    const userInfo = JSON.parse(userInfoJsonStr) as IUserInfo;

    if (!userInfo) {
      return {};
    }

    return userInfo;
  } catch (e) {
    return {};
  }
}
