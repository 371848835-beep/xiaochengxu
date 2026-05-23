const STS = require('qcloud-cos-sts');
const crypto = require('crypto');

function getCredentialAsync(options) {
  return new Promise((resolve, reject) => {
    STS.getCredential(options, (err, credential) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(credential);
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const config = {
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
      durationSeconds: 1800,
      bucket: process.env.TENCENTCLOUD_COS_BUCKET,
      region: process.env.TENCENTCLOUD_REGION,
      allowPrefix: 'uploads/*',
      allowActions: ['name/cos:PutObject', 'name/cos:PostObject'],
    };

    if (!config.secretId || !config.secretKey || !config.bucket || !config.region) {
      return res.status(500).json({
        error: '环境变量未配置完整',
        missing: {
          TENCENTCLOUD_SECRET_ID: !config.secretId,
          TENCENTCLOUD_SECRET_KEY: !config.secretKey,
          TENCENTCLOUD_COS_BUCKET: !config.bucket,
          TENCENTCLOUD_REGION: !config.region,
        },
      });
    }

    const credential = await getCredentialAsync({
      secretId: config.secretId,
      secretKey: config.secretKey,
      durationSeconds: config.durationSeconds,
      policy: STS.getPolicy([
        {
          action: config.allowActions,
          bucket: config.bucket,
          region: config.region,
          prefix: '*', // 修改为允许操作所有路径，解决 AccessDenied 问题
        },
      ]),
    });

    const creds = credential.credentials || credential;
    const tmpSecretId = creds.tmpSecretId;
    const tmpSecretKey = creds.tmpSecretKey;
    const sessionToken = creds.sessionToken;
    const startTime = credential.startTime || Math.floor(Date.now() / 1000);
    const expiredTime = credential.expiredTime || (startTime + config.durationSeconds);
    const keyTime = `${startTime};${expiredTime}`;

    // 使用更简单可靠的 Authorization Header 签名方案 (针对 POST /)
    const signKey = crypto.createHmac('sha1', tmpSecretKey).update(keyTime).digest('hex');
    const httpMethod = 'post';
    const httpUri = '/';
    const httpParameters = '';
    const httpHeaders = '';
    
    const httpString = `${httpMethod}\n${httpUri}\n${httpParameters}\n${httpHeaders}\n`;
    const sha1edHttpString = crypto.createHash('sha1').update(httpString).digest('hex');
    
    const stringToSign = `sha1\n${keyTime}\n${sha1edHttpString}\n`;
    const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');
    
    const authorization = `q-sign-algorithm=sha1&q-ak=${tmpSecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=&q-url-param-list=&q-signature=${signature}`;

    // 同时生成表单需要的 Policy（因为 wx.uploadFile 本质是 multipart/form-data，必须带 policy 字段才能过 COS 的严格校验）
    const policyObj = {
      "expiration": new Date(expiredTime * 1000).toISOString(),
      "conditions": [
        {"q-sign-algorithm": "sha1"},
        {"q-ak": tmpSecretId},
        {"q-sign-time": keyTime}
      ]
    };
    const policyStr = JSON.stringify(policyObj);
    const policyBase64 = Buffer.from(policyStr).toString('base64');

    return res.status(200).json({
      credentials: creds,
      startTime: startTime,
      expiredTime: expiredTime,
      bucket: config.bucket,
      region: config.region,
      authorization: authorization,
      sessionToken: sessionToken,
      postData: {
        'q-sign-algorithm': 'sha1',
        'q-ak': tmpSecretId,
        'q-key-time': keyTime,
        'q-signature': signature,
        'policy': policyBase64
      }
    });
  } catch (error) {
    console.error('STS Error:', error);
    return res.status(500).json({
      error: '获取临时凭证失败',
      message: error && error.message ? error.message : String(error),
      code: error && error.code ? error.code : '',
    });
  }
};
