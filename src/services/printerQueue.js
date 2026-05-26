const queue = [];
let printing = false;

export async function addPrintJob(job) {
  queue.push({
    ...job,
    createdAt: Date.now(),
    retries: 0,
  });

  processQueue();
}

async function processQueue() {
  if (printing || queue.length === 0) return;

  printing = true;
  const job = queue.shift();

  try {
    console.log(`[PRINT] ${job.type}:`, job.payload);
    await new Promise((resolve) => setTimeout(resolve, 400));
  } catch (error) {
    if (job.retries < 3) {
      job.retries += 1;
      queue.push(job);
    }
  }

  printing = false;

  if (queue.length > 0) {
    processQueue();
  }
}
