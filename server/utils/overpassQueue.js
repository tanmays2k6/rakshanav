const requestQueue = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  while (requestQueue.length > 0) {
    const { task, resolve, reject } = requestQueue.shift();
    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    }
    // Wait 1.5 seconds between overpass requests to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
  isProcessingQueue = false;
}

exports.enqueueOverpassTask = function(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject });
    processQueue();
  });
};
