const STS = require('qcloud-cos-sts');

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
          prefix: config.allowPrefix,
        },
      ]),
    });

    return res.status(200).json({
      credentials: credential.credentials || credential,
      startTime: credential.startTime,
      expiredTime: credential.expiredTime,
      bucket: config.bucket,
      region: config.region,
    });
  } catch (error) {
    console.error('STS Error:', error);
    return res.status(500).json({
      error: '获取临时凭证失败',
      detail: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      message: error && error.message ? error.message : '',
      code: error && error.code ? error.code : '',
      name: error && error.name ? error.name : '',
      stack: error && error.stack ? error.stack : ''
    });
  }
