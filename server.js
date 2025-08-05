const express = require('express');
const { Worker } = require('worker_threads');
const { Queue } = require('./utils/queue');
const AiStudioWorker = require('./ai-studio-worker');

const app = express();
const port = 5000;

// Middleware
app.use(express.json());

// Job queue and valid types
const jobQueue = new Queue();
const VALID_TYPES = ['stock', 'news', 'market', 'checknews', 'restructure'];

// Initialize worker
const aiStudioWorker = new AiStudioWorker();

// Routes
app.post('/test', (req, res) => {
    const data = req.body;
    console.log('📥 Nhận request mới:');
    console.log(`  📝 Dữ liệu: ${JSON.stringify(data)}`);
    res.json({ status: true, data });
});

app.get('/status', async (req, res) => {
    try {
        const chromeAlive = await aiStudioWorker.checkChromeStatus();
        res.json({ status: true, chrome_alive: chromeAlive });
    } catch (error) {
        console.log(`⚠️ Chrome check error: ${error.message}`);
        res.json({ status: false, chrome_alive: false });
    }
});

app.post('/submit', (req, res) => {
    const { prompt, request_id, callback_url, type, temperature } = req.body;

    // Log request info
    console.log('📥 Nhận request mới:');
    console.log(`  🆔 request_id: ${request_id}`);
    console.log(`  📄 type      : ${type}`);
    console.log(`  🔗 callback  : ${callback_url}`);
    console.log(`  🔗 temperature  : ${temperature}`);
    console.log(`  📝 prompt    : ${prompt ? prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') : ''}`);

    // Validation
    if (!prompt || !request_id || !callback_url || !type) {
        return res.status(400).json({
            error: 'Missing prompt, request_id, callback_url or type',
        });
    }

    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
            error: `Invalid type '${type}'. Must be one of ${VALID_TYPES.join(', ')}`,
        });
    }

    console.log('sent to queue');
    jobQueue.enqueue({ prompt, request_id, callback_url, temperature, type });

    const result_payload = {
        request_id,
        status: 'queued',
        result_html: '',
    };

    res.json(result_payload);
});

// Worker loop function
async function workerLoop() {
    while (true) {
        try {
            const job = await jobQueue.dequeue();
            if (job) {
                const { prompt, request_id, callback_url, temperature, type } = job;
                try {
                    await aiStudioWorker.safeProcessPrompt(prompt, request_id, callback_url, temperature, type);
                } catch (error) {
                    console.log(`❌ Lỗi xử lý request ${request_id}: ${error.message}`);
                }
            } else {
                // Wait a bit if no jobs
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.log(`❌ Worker loop error: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    console.log('🚀 Worker thread started.');

    // Start worker loop
    workerLoop().catch(console.error);
});

module.exports = app;