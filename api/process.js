const tencentcloud = require("tencentcloud-sdk-nodejs");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { videoUrl, boxes, intensity } = req.body;

  if (!videoUrl || !boxes || boxes.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters: videoUrl, boxes' });
  }

  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;

  if (!secretId || !secretKey) {
    console.warn("API keys not found, using mock processing.");
    return res.status(200).json({
      taskId: `mock_task_${Date.now()}`,
      status: 'PROCESSING',
      message: '使用模拟任务 (未配置 API 密钥)'
    });
  }

  try {
    const MpsClient = tencentcloud.mps.v20190612.Client;
    const clientConfig = {
      credential: {
        secretId: secretId,
        secretKey: secretKey,
      },
      region: process.env.TENCENTCLOUD_REGION || "ap-guangzhou",
      profile: {
        httpProfile: {
          endpoint: "mps.tencentcloudapi.com",
        },
      },
    };

    const client = new MpsClient(clientConfig);

    // 构造MPS媒体处理参数，实际需要根据腾讯云API文档调整
    const params = {
      InputInfo: {
        Type: "URL",
        UrlInputInfo: { Url: videoUrl }
      },
      OutputStorage: {
        Type: "COS",
        CosOutputStorage: {
          Bucket: process.env.TENCENTCLOUD_COS_BUCKET || "default-bucket",
          Region: process.env.TENCENTCLOUD_REGION || "ap-guangzhou"
        }
      },
      OutputDir: "/watermark_removed/",
      MediaProcessTask: {
        // 水印去除参数 (Mock structure)
        WatermarkParameters: boxes.map((box) => ({
          Type: "Image",
          CoordinateOrigin: "TopLeft",
          XPos: `${box.x}%`,
          YPos: `${box.y}%`,
          Width: `${box.width}%`,
          Height: `${box.height}%`
        }))
      }
    };

    const response = await client.ProcessMedia(params);
    
    return res.status(200).json({
      taskId: response.TaskId,
      status: 'PROCESSING',
      message: '处理任务已提交'
    });
  } catch (error) {
    console.error("Tencent Cloud API Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
