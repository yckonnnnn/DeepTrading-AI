import dotenv from 'dotenv';
import popCore from '@alicloud/pop-core';

dotenv.config({ path: '.env.local' });

const DM_ACCESS_KEY_ID = process.env.ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID;
const DM_ACCESS_KEY_SECRET = process.env.ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET;
const DM_ACCOUNT_NAME = process.env.ACCOUNT_NAME || process.env.ALIYUN_DM_ACCOUNT_NAME;
const DM_FROM_ALIAS = process.env.FROM_ALIAS || process.env.ALIYUN_DM_FROM_ALIAS || 'deeptrading注册验证';
const DM_REPLY_ADDRESS = process.env.REPLY_ADDRESS || process.env.ALIYUN_DM_REPLY_ADDRESS || DM_ACCOUNT_NAME;

const isEmailServiceConfigured = () => {
  return Boolean(DM_ACCESS_KEY_ID && DM_ACCESS_KEY_SECRET && DM_ACCOUNT_NAME);
};

async function sendAliyunVerifyEmail(toEmail, verifyCode) {
  if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
    throw new Error('Aliyun DirectMail env missing');
  }

  const RPCClient = popCore?.RPCClient || popCore?.default?.RPCClient || popCore?.default || popCore;
  const client = new RPCClient({
    accessKeyId: DM_ACCESS_KEY_ID,
    accessKeySecret: DM_ACCESS_KEY_SECRET,
    endpoint: 'https://dm.aliyuncs.com',
    apiVersion: '2015-11-23'
  });

  const params = {
    AccountName: DM_ACCOUNT_NAME,
    FromAlias: DM_FROM_ALIAS,
    AddressType: 1,
    ToAddress: toEmail,
    Subject: '【deeptrading】注册验证码',
    TextBody: `您的注册验证码是：${verifyCode}，5分钟内有效，请及时填写。`,
    ReplyToAddress: 'false'
  };

  return client.request('SingleSendMail', params, { method: 'POST' });
}

async function sendAliyunResetPasswordEmail(toEmail, verifyCode) {
  if (!DM_ACCESS_KEY_ID || !DM_ACCESS_KEY_SECRET || !DM_ACCOUNT_NAME) {
    throw new Error('Aliyun DirectMail env missing');
  }
  const RPCClient = popCore.RPCClient;
  const client = new RPCClient({
    accessKeyId: DM_ACCESS_KEY_ID,
    accessKeySecret: DM_ACCESS_KEY_SECRET,
    endpoint: 'https://dm.aliyuncs.com',
    apiVersion: '2015-11-23'
  });

  const params = {
    AccountName: DM_ACCOUNT_NAME,
    FromAlias: DM_FROM_ALIAS,
    AddressType: 1,
    ToAddress: toEmail,
    Subject: '【deeptrading】找回密码验证码',
    TextBody: `您的找回密码验证码是：${verifyCode}，5分钟内有效，请及时填写。`,
    ReplyToAddress: 'false'
  };

  return client.request('SingleSendMail', params, { method: 'POST' });
}

export {
  DM_REPLY_ADDRESS,
  isEmailServiceConfigured,
  sendAliyunVerifyEmail,
  sendAliyunResetPasswordEmail
};
