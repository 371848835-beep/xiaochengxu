const STS = require('qcloud-cos-sts');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const config = {
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
      proxy: '',
      durationSeconds: 1800, // 临时密钥有效时间，单位：秒
      bucket: process.env.TENCENTCLOUD_COS_BUCKET,
      region: process.env.TENCENTCLOUD_REGION,
      allowPrefix: 'uploads/*', // 允许操作的前缀
      allowActions: [
        'name/cos:PutObject',
        'name/cos:PostObject'
      ],
    };

    const credential = await STS.getCredential({
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

    res.json({
      credentials: credential.credentials,
      startTime: credential.startTime,
      expiredTime: credential.expiredTime,
      bucket: config.bucket,
      region: config.region
    });
  } catch (error) {
    console.error("STS Error:", error);
    res.status(500).json({
      error: '获取临时凭证失败',
      message: error && error.message ? error.message : String(error),
      code: error && error.code ? error.code : ''
    });
  }
