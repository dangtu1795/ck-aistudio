const express = require('express');
const { Worker } = require('worker_threads');
const { Queue } = require('./utils/queue');
const AiStudioWorker = require('./ai-studio-worker');

const app = express();
const port = 6000;

// Middleware
app.use(express.json());

// Job queue and valid types
const jobQueue = new Queue();
const VALID_TYPES = ['stock', 'news', 'market', 'checknews', 'asset'];

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

const data= {
"fa": "<div style='font-family: Arial, sans-serif; line-height: 1.6; font-size: 14px;'> <h4 style='color: #1a237e;'>Đánh giá toàn diện chất lượng doanh nghiệp</h4> <p>Phân tích cơ bản của Novaland (NVL) cho thấy một bức tranh tài chính với nhiều điểm cần lưu ý, đặc trưng của một doanh nghiệp bất động sản quy mô lớn đang trong giai đoạn đầu tư và tái cấu trúc mạnh mẽ.</p> <h5 style='color: #283593;'>Sức khỏe tài chính:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Tỷ lệ Nợ cao:</strong> Tỷ số Nợ trên Tổng tài sản dao động quanh mức 80% và Tỷ số Nợ vay trên Vốn chủ sở hữu ở mức trên 120% là những con số rất cao.[1] Điều này cho thấy đòn bẩy tài chính lớn, tiềm ẩn rủi ro về khả năng thanh toán, đặc biệt là các khoản nợ vay và trái phiếu đến hạn.[1][2][3][4][5][6]</li> <li><strong>Khả năng thanh toán ngắn hạn:</strong> Tỷ số thanh toán hiện hành duy trì quanh mức 2.0, đây là một điểm tích cực, cho thấy về mặt lý thuyết, tài sản ngắn hạn đủ để chi trả cho các khoản nợ ngắn hạn. Tuy nhiên, cần xem xét kỹ chất lượng của tài sản ngắn hạn (chủ yếu là hàng tồn kho và các khoản phải thu).</li> </ul> <h5 style='color: #283593;'>Hiệu quả hoạt động:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Biên lợi nhuận không ổn định:</strong> Tỷ suất lợi nhuận gộp và lợi nhuận thuần có sự biến động rất lớn giữa các quý, thậm chí ghi nhận giá trị âm. Điều này phản ánh hoạt động kinh doanh chưa ổn định, phụ thuộc nhiều vào thời điểm bàn giao dự án và các hoạt động tài chính.[6]</li> <li><strong>Hiệu quả sử dụng vốn thấp:</strong> Các chỉ số ROEA (Tỷ suất lợi nhuận trên vốn chủ sở hữu) và ROAA (Tỷ suất sinh lợi trên tổng tài sản) rất biến động và thường ở mức thấp, thậm chí âm.[6] Điều này cho thấy việc sử dụng vốn và tài sản để tạo ra lợi nhuận chưa hiệu quả trong các giai đoạn gần đây.</li> </ul> <h5 style='color: #283593;'>Tăng trưởng:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Doanh thu và Lợi nhuận biến động mạnh:</strong> Mặc dù doanh thu thuần có xu hướng tăng trưởng qua các quý, lợi nhuận sau thuế lại cực kỳ thất thường, có quý lãi lớn nhưng cũng có quý lỗ. Sự tăng trưởng không bền vững này chủ yếu do đặc thù ngành và các thương vụ tài chính.</li> </ul> <h5 style='color: #283593;'>Rủi ro hiện tại:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Rủi ro thanh khoản:</strong> Đây là rủi ro lớn nhất, thể hiện qua áp lực trả nợ trái phiếu và các khoản vay đến hạn trong bối cảnh dòng tiền từ hoạt động kinh doanh chính chưa ổn định.[1][2][3][5]</li> <li><strong>Rủi ro từ hàng tồn kho:</strong> Hàng tồn kho chiếm tỷ trọng rất lớn trong tổng tài sản, chủ yếu là chi phí đầu tư vào các dự án đang triển khai.[7] Tiến độ pháp lý và khả năng bán hàng của các dự án này sẽ quyết định khả năng chuyển hóa hàng tồn kho thành tiền mặt của công ty.[4][5][7]</li> </ul> </div>",
"ta": "<div style='font-family: Arial, sans-serif; line-height: 1.6; font-size: 14px;'> <h4 style='color: #1a237e;'>Đánh giá xu hướng giá và dòng tiền</h4> <p>Các chỉ báo kỹ thuật của cổ phiếu NVL đang cho thấy những tín hiệu tích cực trong ngắn hạn, tuy nhiên cần chú ý đến các yếu tố rủi ro đi kèm.</p> <h5 style='color: #283593;'>Phân tích các chỉ số:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Xu hướng tăng giá:</strong> Giá hiện tại (17,100) đang nằm trên các đường trung bình động quan trọng: EMA20 (16,310), EMA50 (15,150) và EMA200 (12,920). Việc các đường EMA được sắp xếp theo thứ tự EMA20 > EMA50 > EMA200 củng cố cho một xu hướng tăng giá trên cả ngắn, trung và dài hạn.</li> <li><strong>Dòng tiền mạnh:</strong> Khối lượng giao dịch trung bình 10 phiên đạt hơn 31 triệu cổ phiếu là một mức rất cao, cho thấy cổ phiếu đang thu hút sự quan tâm lớn của thị trường. Dòng tiền mạnh là yếu tố cần thiết để hỗ trợ đà tăng giá.</li> </ul> <h5 style='color: #283593;'>Tín hiệu giao dịch ngắn hạn:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li>Dữ liệu lướt sóng cho tín hiệu mua từ ngày 01/08/2025 giá thoả tại 17.05.</li> <li>Tín hiệu T+ hiện đang được củng cố bởi các đường EMA.</li> </ul> <p><strong>Chú ý:</strong> Ngày hiện tại cách ngày thoả tín hiệu mua càng xa và dòng tiền suy yếu thì rủi ro T+ càng lớn.</p> </div>",
"news": "<div style='font-family: Arial, sans-serif; line-height: 1.6; font-size: 14px;'> <h4 style='color: #1a237e;'>Tổng hợp và đánh giá tin tức</h4> <p>Các thông tin gần đây về Novaland (NVL) mang nhiều màu sắc trái chiều, tập trung chủ yếu vào các vấn đề tài chính và pháp lý dự án, tạo ra một bối cảnh đầy thách thức cho cổ phiếu.</p> <h5 style='color: #283593;'>Những điểm nổi bật:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Áp lực từ trái phiếu:</strong> Tin tức nổi bật và có tác động tiêu cực nhất là việc công ty con của Novaland gặp khó khăn trong việc đáo hạn trái phiếu.[2][3][5] Việc liên tục phải xin gia hạn hoặc chậm thanh toán các lô trái phiếu cho thấy áp lực rất lớn về dòng tiền và khả năng thanh khoản của công ty, ảnh hưởng trực tiếp đến niềm tin của nhà đầu tư.[2][3][5]</li> <li><strong>Kết quả kinh doanh thua lỗ:</strong> Nhiều nguồn tin đã báo cáo về việc NVL tiếp tục ghi nhận lỗ trong các quý gần đây, dù doanh thu có sự cải thiện.[2][3][7][8] Nguyên nhân chính là do gánh nặng chi phí tài chính và các khoản lỗ khác.[2][3][7]</li> <li><strong>Nỗ lực tái cấu trúc và pháp lý dự án:</strong> Phía tích cực, có thông tin về việc một số dự án lớn của Novaland như Aqua City đang dần được tháo gỡ vướng mắc pháp lý.[5] Đây là yếu tố sống còn, vì việc hoàn thiện pháp lý sẽ giúp công ty có thể tiếp tục triển khai, bán hàng và ghi nhận dòng tiền.[4][5]</li> <li><strong>Diễn biến giá cổ phiếu ngược thị trường:</strong> Một số bài phân tích chỉ ra rằng trong những phiên thị trường chung tăng điểm mạnh mẽ nhờ nhóm vốn hóa lớn, cổ phiếu NVL lại ghi nhận sự sụt giảm. Điều này cho thấy sự e ngại của dòng tiền đối với những rủi ro riêng của doanh nghiệp.</li> </ul> <h5 style='color: #283593;'>Đánh giá tác động:</h5> <p>Trong ngắn hạn, các tin tức tiêu cực về tài chính (khó khăn trả nợ, kết quả kinh doanh thua lỗ) đang có tác động mạnh hơn và lấn át các thông tin tích cực về việc gỡ rối pháp lý dự án. Những thông tin này trực tiếp làm gia tăng rủi ro trong mắt nhà đầu tư và có thể tiếp tục gây áp lực lên giá cổ phiếu.[7]</p> </div>",
"summary": "<div style='font-family: Arial, sans-serif; line-height: 1.6; font-size: 14px;'> <h4 style='color: #1a237e;'>Nhận định tổng quan và chiến lược đầu tư</h4> <h5 style='color: #283593;'>Nhận định tổng quan:</h5> <p>Cổ phiếu NVL đang ở trong một giai đoạn có sự mâu thuẫn rõ rệt giữa các yếu tố phân tích. Về mặt kỹ thuật, cổ phiếu đang thể hiện một xu hướng tăng giá mạnh mẽ, được hỗ trợ bởi dòng tiền lớn. Tuy nhiên, xét về cơ bản và tin tức, doanh nghiệp đang phải đối mặt với những rủi ro cực kỳ lớn, đặc biệt là áp lực thanh khoản từ các khoản nợ vay và trái phiếu khổng lồ, cùng với kết quả kinh doanh thua lỗ.[1][2][3][6] Đây là một cổ phiếu mang tính đầu cơ cao, biến động giá có thể không hoàn toàn phản ánh sức khỏe nội tại của doanh nghiệp mà bị chi phối nhiều bởi kỳ vọng và tâm lý thị trường.[4]</p> <h5 style='color: #283593;'>Rủi ro và Cơ hội:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Cơ hội:</strong> <br> - <i>Ngắn hạn:</i> Sức mạnh từ phân tích kỹ thuật và dòng tiền đầu cơ có thể tiếp tục đẩy giá cổ phiếu lên cao hơn.[9][10] <br> - <i>Trung hạn:</i> Nếu Novaland tái cấu trúc nợ thành công và các dự án trọng điểm được tháo gỡ hoàn toàn pháp lý, tiềm năng tăng trưởng của cổ phiếu là rất lớn nhờ quỹ đất rộng và các dự án quy mô.[1][4][11]</li> <li><strong>Rủi ro:</strong> <br> - <i>Ngắn hạn:</i> Bất kỳ thông tin tiêu cực nào liên quan đến việc không thể thanh toán nợ đúng hạn đều có thể kích hoạt một đợt bán tháo mạnh.[7] Rủi ro T+ là hiện hữu khi giá đã tăng một nhịp. <br> - <i>Trung hạn:</i> Rủi ro lớn nhất là khả năng vỡ nợ hoặc pha loãng cổ phiếu quá mức thông qua các đợt phát hành để hoán đổi nợ, gây thiệt hại cho cổ đông.[1][6][12]</li> </ul> <h5 style='color: #283593;'>Chiến lược đầu tư ngắn hạn:</h5> <ul style='list-style-type: circle; padding-left: 20px;'> <li><strong>Đối với nhà đầu tư đang nắm giữ cổ phiếu:</strong> Với xu hướng kỹ thuật đang tốt, có thể tiếp tục nắm giữ để tối ưu hóa lợi nhuận. Tuy nhiên, cần tuyệt đối tuân thủ kỷ luật, chủ động đặt ra các mức giá chặn lãi hoặc cắt lỗ để bảo vệ tài khoản trước những biến động bất ngờ từ các tin tức tài chính của công ty.</li> <li><strong>Đối với nhà đầu tư chưa nắm giữ cổ phiếu:</strong> Việc mở vị thế mua mới ở thời điểm này có độ rủi ro cao do giá đã tăng và các yếu tố cơ bản còn yếu kém. Cần cân nhắc kỹ lưỡng tỷ trọng giải ngân. Một chiến lược an toàn hơn có thể là chờ đợi những tín hiệu rõ ràng hơn về việc cải thiện sức khỏe tài chính của doanh nghiệp hoặc chờ giá điều chỉnh về các vùng hỗ trợ tin cậy.</li> </ul> </div>"
}