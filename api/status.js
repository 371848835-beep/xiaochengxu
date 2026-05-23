const tencentcloud = require("tencentcloud-sdk-nodejs");

module.exports = async (req, res) => {
  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId' });
  }

  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;

  if (!secretId || !secretKey) {
    // Mock progress for demo purposes
    // Use the timestamp in taskId to calculate progress
    const parts = taskId.split('_');
    const startTime = parseInt(parts[2] || Date.now());
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, Math.floor(elapsed / 100)); // 1% per 100ms, completes in 10s

    return res.status(200).json({
      taskId,
      status: progress >= 100 ? 'FINISHED' : 'PROCESSING',
      progress: progress >= 100 ? 100 : progress,
      resultUrl: progress >= 100 ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null
    });
  }

  try {
    const MpsClient = tencentcloud.mps.v20190612.Client;
    const client = new MpsClient({
      credential: { secretId, secretKey },
      region: process.env.TENCENTCLOUD_REGION || "ap-guangzhou",
      profile: {
        httpProfile: { endpoint: "mps.tencentcloudapi.com" },
      },
    });

    const response = await client.DescribeTaskDetail({ TaskId: taskId });
    
    let status = response.TaskType;
    let progress = 0;
    let resultUrl = null;

    if (response.Status === "FINISH") {
      status = 'FINISHED';
      progress = 100;
      resultUrl = response.MediaProcessTask?.Output?.Url || null;
    } else if (response.Status === "PROCESSING") {
      status = 'PROCESSING';
      progress = response.Progress || 50;
    } else {
      status = 'FAILED';
    }

    return res.status(200).json({
      taskId,
      status,
      progress,
      resultUrl
    });
  } catch (error) {
    console.error("Tencent Cloud API Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
