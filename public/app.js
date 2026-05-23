document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  
  const uploadSection = document.getElementById('upload-section');
  const editSection = document.getElementById('edit-section');
  const resultSection = document.getElementById('result-section');
  
  const previewVideo = document.getElementById('preview-video');
  const canvas = document.getElementById('selection-canvas');
  const ctx = canvas.getContext('2d');
  
  const btnDraw = document.getElementById('btn-draw');
  const btnClear = document.getElementById('btn-clear');
  const boxList = document.getElementById('box-list');
  const btnProcess = document.getElementById('btn-process');
  const btnBack = document.getElementById('btn-back');
  const intensitySelect = document.getElementById('intensity');
  
  const processingView = document.getElementById('processing-view');
  const finishedView = document.getElementById('finished-view');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const resultVideo = document.getElementById('result-video');
  const btnDownload = document.getElementById('btn-download');
  const btnProcessAnother = document.getElementById('btn-process-another');

  // State
  let currentFile = null;
  let videoUrl = null;
  let isDrawingMode = false;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let boxes = []; // Array of {x, y, w, h} relative to video Render Rect (0-100%)
  let canvasRects = []; // Array of pixel rects for drawing

  // --- Upload Logic ---
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-blue-50', 'border-blue-400');
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-50', 'border-blue-400');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-50', 'border-blue-400');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('video/')) {
      alert('请上传视频文件！');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      alert('视频大小不能超过500MB！');
      return;
    }
    currentFile = file;
    videoUrl = URL.createObjectURL(file);
    previewVideo.src = videoUrl;
    
    // Switch to edit section
    uploadSection.classList.add('hidden');
    editSection.classList.remove('hidden');
    editSection.classList.add('flex');
    
    // Resize canvas to match video container on load
    previewVideo.onloadedmetadata = () => {
      resizeCanvas();
    };
  }

  // --- Canvas & Drawing Logic ---
  function resizeCanvas() {
    canvas.width = previewVideo.clientWidth;
    canvas.height = previewVideo.clientHeight;
    redraw();
  }
  window.addEventListener('resize', () => {
    if (!editSection.classList.contains('hidden')) {
      resizeCanvas();
    }
  });

  function getVideoRenderedRect() {
    if (!previewVideo.videoWidth) return null;
    const videoRatio = previewVideo.videoWidth / previewVideo.videoHeight;
    const elementRatio = previewVideo.clientWidth / previewVideo.clientHeight;
    
    let renderWidth, renderHeight, renderX, renderY;
    
    if (elementRatio > videoRatio) {
      renderHeight = previewVideo.clientHeight;
      renderWidth = renderHeight * videoRatio;
      renderX = (previewVideo.clientWidth - renderWidth) / 2;
      renderY = 0;
    } else {
      renderWidth = previewVideo.clientWidth;
      renderHeight = renderWidth / videoRatio;
      renderX = 0;
      renderY = (previewVideo.clientHeight - renderHeight) / 2;
    }
    return { x: renderX, y: renderY, w: renderWidth, h: renderHeight };
  }

  btnDraw.addEventListener('click', () => {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
      btnDraw.textContent = '完成绘制';
      btnDraw.classList.replace('bg-blue-50', 'bg-blue-600');
      btnDraw.classList.replace('text-blue-600', 'text-white');
      canvas.classList.remove('pointer-events-none');
    } else {
      btnDraw.textContent = '开启绘制';
      btnDraw.classList.replace('bg-blue-600', 'bg-blue-50');
      btnDraw.classList.replace('text-white', 'text-blue-600');
      canvas.classList.add('pointer-events-none');
    }
  });

  btnClear.addEventListener('click', () => {
    boxes = [];
    canvasRects = [];
    updateBoxList();
    redraw();
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!isDrawingMode) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    redraw();
    
    // Draw current temp box
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.rect(startX, startY, currentX - startX, currentY - startY);
    ctx.fill();
    ctx.stroke();
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);
    
    if (w > 10 && h > 10) {
      // Save pixel rect
      canvasRects.push({ x, y, w, h });
      
      // Calculate relative to video render rect
      const vRect = getVideoRenderedRect();
      if (vRect) {
        // Clamp to video bounds
        const vx = Math.max(0, x - vRect.x);
        const vy = Math.max(0, y - vRect.y);
        const vw = Math.min(vRect.w - vx, w);
        const vh = Math.min(vRect.h - vy, h);
        
        const pctX = ((vx / vRect.w) * 100).toFixed(2);
        const pctY = ((vy / vRect.h) * 100).toFixed(2);
        const pctW = ((vw / vRect.w) * 100).toFixed(2);
        const pctH = ((vh / vRect.h) * 100).toFixed(2);
        
        boxes.push({ x: pctX, y: pctY, width: pctW, height: pctH });
        updateBoxList();
      }
    }
    redraw();
  });

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    
    canvasRects.forEach(r => {
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      ctx.stroke();
    });
  }

  function updateBoxList() {
    boxList.innerHTML = '';
    boxes.forEach((box, i) => {
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center bg-gray-50 p-2 rounded';
      li.innerHTML = `
        <span class="text-gray-600">区域 ${i + 1} (${box.width}% × ${box.height}%)</span>
        <button class="text-red-500 hover:text-red-700 font-bold" data-index="${i}">×</button>
      `;
      boxList.appendChild(li);
    });
    
    // Add delete listeners
    boxList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        boxes.splice(index, 1);
        canvasRects.splice(index, 1);
        updateBoxList();
        redraw();
      });
    });
  }

  btnBack.addEventListener('click', () => {
    editSection.classList.add('hidden');
    editSection.classList.remove('flex');
    uploadSection.classList.remove('hidden');
    previewVideo.pause();
    URL.revokeObjectURL(videoUrl);
    boxes = [];
    canvasRects = [];
    updateBoxList();
    if (isDrawingMode) btnDraw.click();
  });

  // --- Processing Logic ---
  btnProcess.addEventListener('click', async () => {
    if (boxes.length === 0) {
      alert('请至少框选一个需要去除的水印或字幕区域！');
      return;
    }

    // Prepare UI
    editSection.classList.add('hidden');
    editSection.classList.remove('flex');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('flex');
    processingView.classList.remove('hidden');
    finishedView.classList.add('hidden');
    
    // In a real environment, we would first upload `currentFile` to COS or similar,
    // get a URL, and pass it to our API.
    // For this demo, we'll pass a dummy URL or local URL and rely on our proxy's mock behavior.
    
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: 'demo-local-video', // Dummy URL for the mock API
          boxes: boxes,
          intensity: intensitySelect.value
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      pollStatus(data.taskId);
      
    } catch (err) {
      alert('处理请求失败: ' + err.message);
      btnBack.click();
    }
  });

  function pollStatus(taskId) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?taskId=${taskId}`);
        const data = await res.json();
        
        if (data.error) {
          clearInterval(interval);
          alert('查询状态失败: ' + data.error);
          return;
        }
        
        progressBar.style.width = `${data.progress}%`;
        progressText.textContent = `${data.progress}%`;
        
        if (data.status === 'FINISHED') {
          clearInterval(interval);
          showFinished(data.resultUrl || videoUrl); // Fallback to original for demo
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          alert('视频处理失败，请重试！');
        }
        
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  }

  function showFinished(url) {
    processingView.classList.add('hidden');
    finishedView.classList.remove('hidden');
    
    resultVideo.src = url;
    btnDownload.href = url;
  }

  btnProcessAnother.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    resultSection.classList.remove('flex');
    uploadSection.classList.remove('hidden');
    previewVideo.pause();
    resultVideo.pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    boxes = [];
    canvasRects = [];
    updateBoxList();
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
  });
});
