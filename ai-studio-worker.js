const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class AiStudioWorker {
    constructor() {
        this.driver = null;
        this.wait = null;
        this.profilePath = path.join(os.tmpdir(), 'TLCK');
        this.tempProfilePath = null; // Store the temp profile path for cleanup
        this.initializeDriver();
    }

    async initializeDriver() {
        try {
            await fs.ensureDir(this.profilePath);
            const options = this.createChromeOptions();
            this.driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
            this.wait = this.driver.wait.bind(this.driver);
            console.log('✅ Chrome driver initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Chrome driver:', error);
        }
    }

    createChromeOptions() {
        // Use consistent profile directory - reuse the same profile each time
        const tempProfile = this.profilePath; // Use the existing profilePath from constructor

        // Store the temp profile path for cleanup
        this.tempProfilePath = tempProfile;

        fs.ensureDirSync(tempProfile);

        const options = new chrome.Options();
        options.addArguments('--disable-blink-features=AutomationControlled');
        options.addArguments(`--user-data-dir=${tempProfile}`);
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
        options.addArguments('--disable-features=VizDisplayCompositor');
        options.addArguments('--remote-debugging-port=0');
        // Suppress specific error messages
        options.addArguments('--disable-logging');
        options.addArguments('--log-level=3');
        options.addArguments('--silent');
        options.addArguments('--disable-background-timer-throttling');
        options.addArguments('--disable-backgrounding-occluded-windows');
        options.addArguments('--disable-renderer-backgrounding');
        options.addArguments('--disable-features=TranslateUI');
        options.addArguments('--disable-ipc-flooding-protection');
        options.addArguments('--disable-extensions');
        options.addArguments('--disable-component-extensions-with-background-pages');
        options.addArguments('--disable-default-apps');
        options.addArguments('--disable-sync');
        options.addArguments('--disable-background-networking');
        options.addArguments('--disable-gcm-provider');
        options.addArguments('--disable-on-device-model');
        options.setPageLoadStrategy('eager');

        return options;
    }

    async checkChromeStatus() {
        try {
            if (!this.driver) return false;
            await this.driver.getTitle();
            return true;
        } catch (error) {
            return false;
        }
    }

    async notifyError(callbackUrl, requestId, errorMessage = '') {
        try {
            const errorPayload = {
                request_id: requestId,
                status: 'error',
                result_data: errorMessage,
            };
            await axios.post(callbackUrl, errorPayload);
            console.log(`📡 Đã gửi lỗi về server: ${errorMessage}`);
        } catch (error) {
            console.log(`⚠️ Gửi callback thất bại: ${error.message}`);
        }
    }

    extractJsonFromCodeBlock(htmlContent, prompt, requestId, callbackUrl, temperature, type) {
        try {
            const $ = cheerio.load(htmlContent);
            const codeBlock = $('code').first();

            if (codeBlock.length === 0) {
                throw new Error('❌ Không tìm thấy thẻ <code> trong HTML');
            }

            let cleanText = codeBlock.text();

            // Find JSON using regex
            const match = cleanText.match(/\{[\s\S]*\}/);
            if (!match) {
                throw new Error('❌ Không tìm thấy JSON trong nội dung đã làm sạch');
            }

            const jsonStr = match[0];
            JSON.parse(jsonStr); // Validate JSON

            return jsonStr;
        } catch (error) {
            console.log(`❌ Lỗi extract JSON từ HTML: ${error.message}`);
            if (callbackUrl && requestId) {
                this.safeProcessPrompt(prompt, requestId, callbackUrl, temperature, type);
            }
            return null;
        }
    }

    async setTextareaValueByJs(fullPrompt) {
        const script = `
            const textarea = document.querySelector("textarea");
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeInputValueSetter.call(textarea, arguments[0]);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        `;
        await this.driver.executeScript(script, fullPrompt);
        console.log('✅ Đã set giá trị prompt bằng JavaScript');
    }

    async setTemperatureValue(temperature) {
        try {
            // Thử nhiều selector khác nhau để tìm input temperature
            const selectors = [
                'input[ms-input][type="number"]',  // Selector mới
                'input.v3-font-label[type="number"]',  // Selector mới với class
                'input[type="number"][min="0"][max="2"]',  // Selector theo attributes
                'input.manual-input[type="number"]',  // Selector cũ
                'input[type="number"]'  // Fallback selector
            ];

            let tempInput = null;

            for (const selector of selectors) {
                try {
                    const inputs = await this.driver.findElements(By.css(selector));
                    if (inputs.length > 0) {
                        // Tìm input có thể edit được (visible và enabled)
                        for (const input of inputs) {
                            if (await input.isDisplayed() && await input.isEnabled()) {
                                tempInput = input;
                                console.log(`✅ Tìm thấy temperature input với selector: ${selector}`);
                                break;
                            }
                        }
                        if (tempInput) break;
                    }
                } catch (selectorError) {
                    // Continue to next selector
                    continue;
                }
            }

            if (!tempInput) {
                console.log('❌ Không tìm thấy temperature input với tất cả selector.');
                return;
            }

            // Scroll đến input để đảm bảo nó visible
            await this.driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", tempInput);
            await this.sleep(300);

            // Clear input trước khi set giá trị mới
            await tempInput.clear();
            await this.sleep(100);

            // Set giá trị bằng JavaScript để đảm bảo tương thích
            await this.driver.executeScript(
                `
                const input = arguments[0];
                const value = arguments[1];
                
                // Clear existing value
                input.value = '';
                input.focus();
                
                // Set new value using native setter
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(input, value.toString());
                
                // Trigger events
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
            `,
                tempInput,
                parseFloat(temperature),
            );

            // Verify the value was set correctly
            const actualValue = await tempInput.getAttribute('value');
            console.log(`✅ Đã set temperature = ${temperature} (verified: ${actualValue})`);

        } catch (error) {
            console.log(`⚠️ Không set được temperature: ${error.message}`);

            // Debug: Log page source for temperature input debugging
            try {
                const pageSource = await this.driver.getPageSource();
                const tempInputMatch = pageSource.match(/<input[^>]*type="number"[^>]*>/gi);
                if (tempInputMatch) {
                    console.log('🔍 Found temperature inputs in page:', tempInputMatch);
                }
            } catch (debugError) {
                console.log(`⚠️ Không thể debug temperature input: ${debugError.message}`);
            }
        }
    }

    async clickRunButton(temperature, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`🔄 Thử click nút Run - lần ${attempt + 1}`);
                console.log('🔍 URL hiện tại:', await this.driver.getCurrentUrl());

                // await this.driver.wait(until.elementLocated(By.className('mdc-slider__input')), 10000);
                await this.setTemperatureValue(temperature);

                // const runButton = await this.driver.wait(until.elementIsEnabled(By.className('run-button-content')), 10000);

                // await runButton.click();
                // click button has mattooltipclass="run-button-tooltip"
                const runButton = await this.driver.wait(
                    until.elementLocated(By.css('button[mattooltipclass="run-button-tooltip"]')),
                    10000,
                );
                await runButton.click();
                console.log('✅ Đã click nút Run thành công');
                return true;
            } catch (error) {
                console.log(`❌ Không tìm thấy hoặc click được nút Run (timeout)`);
                try {
                    const pageSource = await this.driver.getPageSource();
                    await fs.writeFile('run_button_debug.html', pageSource, 'utf8');
                    await this.driver.takeScreenshot().then((data) => {
                        fs.writeFileSync('run_button_debug.png', data, 'base64');
                    });
                } catch (debugError) {
                    console.log(`⚠️ Không thể lưu debug: ${debugError.message}`);
                }
                await this.sleep(2000);
            }
        }
        return false;
    }

    async waitStopButtonDisappear(timeout = 180000) {
        console.log('⏳ Đợi nút Stop biến mất...');
        const start = Date.now();

        while (Date.now() - start < timeout) {
            try {
                const stopButton = await this.driver.findElement(By.xpath('//button[.//span[text()="Stop"]]'));

                if (!(await stopButton.isDisplayed())) {
                    console.log('✅ Nút Stop đã biến mất');
                    return;
                }
            } catch (error) {
                console.log('✅ Không còn thấy nút Stop (DOM removed)');
                return;
            }
            await this.sleep(1000);
        }
        throw new Error('❌ Quá thời gian đợi Stop biến mất');
    }

    extractBraceBlocks(text) {
        const result = [];
        const stack = [];
        let startIdx = null;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '{') {
                if (stack.length === 0) {
                    startIdx = i;
                }
                stack.push('{');
            } else if (char === '}') {
                if (stack.length > 0) {
                    stack.pop();
                    if (stack.length === 0 && startIdx !== null) {
                        result.push(text.substring(startIdx, i + 1));
                        startIdx = null;
                    }
                }
            }
        }
        return result;
    }

    async clickDownloadButton() {
        try {
            // Thử nhiều selector khác nhau để tìm nút Download
            const selectors = [
                'button[mattooltip="Download"]',
                'button[iconname="download"]',
                '.actions-container button[mattooltip="Download"]',
                '.actions-container button[iconname="download"]',
                'button .material-symbols-outlined:contains("download")',
                'button span:contains("download")'
            ];

            let downloadButton = null;

            for (const selector of selectors) {
                try {
                    const buttons = await this.driver.findElements(By.css(selector));
                    if (buttons.length > 0) {
                        // Tìm button có thể click được (visible và enabled)
                        for (const button of buttons) {
                            if (await button.isDisplayed() && await button.isEnabled()) {
                                downloadButton = button;
                                console.log(`✅ Tìm thấy nút Download với selector: ${selector}`);
                                break;
                            }
                        }
                        if (downloadButton) break;
                    }
                } catch (selectorError) {
                    // Continue to next selector
                    continue;
                }
            }

            if (!downloadButton) {
                console.log('❌ Không tìm thấy nút Download.');
                return;
            }

            // Scroll đến button để đảm bảo nó visible
            await this.driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", downloadButton);
            await this.sleep(500);

            // Thử click bằng JavaScript trước
            try {
                await this.driver.executeScript("arguments[0].click();", downloadButton);
                console.log('✅ Đã click nút Download (JavaScript).');
            } catch (jsError) {
                // Fallback to normal click
                await downloadButton.click();
                console.log('✅ Đã click nút Download (click thường).');
            }
        } catch (error) {
            console.log('❌ Lỗi khi bấm nút Download:', error.message);
            throw error;
        }
    }

    async clickCopyToClipboard() {
        try {
            // Thử nhiều selector khác nhau để tìm nút Copy
            const selectors = [
                'button[mattooltip="Copy to clipboard"]',
                'button[iconname="content_copy"]',
                '.actions-container button[mattooltip="Copy to clipboard"]',
                '.actions-container button[iconname="content_copy"]',
                'button .material-symbols-outlined:contains("content_copy")',
                'button span:contains("content_copy")'
            ];

            let copyButton = null;

            for (const selector of selectors) {
                try {
                    const buttons = await this.driver.findElements(By.css(selector));
                    if (buttons.length > 0) {
                        // Tìm button có thể click được (visible và enabled)
                        for (const button of buttons) {
                            if (await button.isDisplayed() && await button.isEnabled()) {
                                copyButton = button;
                                console.log(`✅ Tìm thấy nút Copy với selector: ${selector}`);
                                break;
                            }
                        }
                        if (copyButton) break;
                    }
                } catch (selectorError) {
                    // Continue to next selector
                    continue;
                }
            }

            if (!copyButton) {
                console.log('❌ Không tìm thấy nút Copy với tất cả selector.');
                return;
            }

            // Scroll đến button để đảm bảo nó visible
            await this.driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", copyButton);
            await this.sleep(500);

            // Thử click bằng nhiều cách khác nhau
            let clickSuccess = false;

            // Cách 1: Click bình thường
            try {
                await copyButton.click();
                clickSuccess = true;
                console.log('✅ Đã click nút Copy (click thường).');
            } catch (clickError) {
                console.log('⚠️ Click thường thất bại, thử JavaScript click...');

                // Cách 2: Click bằng JavaScript
                try {
                    await this.driver.executeScript("arguments[0].click();", copyButton);
                    clickSuccess = true;
                    console.log('✅ Đã click nút Copy (JavaScript click).');
                } catch (jsError) {
                    console.log('⚠️ JavaScript click thất bại, thử Actions...');

                    // Cách 3: Sử dụng Actions để move và click
                    try {
                        const actions = this.driver.actions();
                        await actions.move({ origin: copyButton }).click().perform();
                        clickSuccess = true;
                        console.log('✅ Đã click nút Copy (Actions).');
                    } catch (actionsError) {
                        console.log('❌ Tất cả phương thức click đều thất bại');
                        console.log('Click error:', clickError.message);
                        console.log('JS error:', jsError.message);
                        console.log('Actions error:', actionsError.message);
                    }
                }
            }

            if (!clickSuccess) {
                throw new Error('Không thể click nút Copy sau khi thử tất cả phương thức');
            }

        } catch (error) {
            console.log('❌ Lỗi khi bấm nút Copy:', error.message);
            throw error; // Re-throw để trigger fallback trong processPrompt
        }
    }

    async readLatestTxtFileAndDelete() {
        const downloadDir = path.join(os.homedir(), 'Downloads');
        const files = await fs.readdir(downloadDir);
        const txtFiles = files.filter((f) => f.endsWith('.txt'));

        if (txtFiles.length === 0) {
            throw new Error('Không tìm thấy file .txt nào trong thư mục tải xuống.');
        }

        // Get latest file by modification time
        const fileStats = await Promise.all(
            txtFiles.map(async (file) => ({
                name: file,
                stats: await fs.stat(path.join(downloadDir, file)),
            })),
        );

        fileStats.sort((a, b) => b.stats.mtime - a.stats.mtime);
        const latestFile = path.join(downloadDir, fileStats[0].name);

        // Wait for file to be completely downloaded
        for (let i = 0; i < 10; i++) {
            try {
                const content = await fs.readFile(latestFile, 'utf8');
                return content;
            } catch (error) {
                await this.sleep(1000);
            }
        }
        throw new Error(`Không thể mở file ${latestFile}`);
    }

    async processPrompt(prompt, requestId, callbackUrl, temperature, type) {
        try {
            await this.driver.get('https://aistudio.google.com/prompts/new_chat');

            const promptBox = await this.driver.wait(until.elementLocated(By.css('textarea')), 10000);

            await this.setTextareaValueByJs(prompt);
            await this.sleep(1000);

            if (!(await this.clickRunButton(temperature))) {
                throw new Error('Không thể click nút Run sau nhiều lần thử.');
            }

            console.log('🚀 AI đã bắt đầu xử lý');
            await this.driver.wait(until.elementLocated(By.xpath('//button[.//span[text()="Stop"]]')), 30000);

            await this.waitStopButtonDisappear();

            // Check for errors
            const errorElements = await this.driver.findElements(
                By.xpath("//*[contains(text(), 'An internal error has occurred')]"),
            );

            if (errorElements.length > 0) {
                console.log(
                    '❌ Phát hiện lỗi: An internal error has occurred trên giao diện AI Studio. Thử lại từ đầu...',
                );
                await this.safeProcessPrompt(prompt, requestId, callbackUrl, temperature, type);
                return;
            }
            let resultData = null;
            if (['stock', 'news', 'market', 'restructure'].includes(type)) {
                // xoa du lieu trong clipboard
                await this.driver.executeScript('navigator.clipboard.writeText("");');
                console.log('✅ Đã xóa clipboard trước khi lấy kết quả');
                console.log('📋 Đang lấy kết quả từ clipboard...');

                let clipboardContent = '';
                let copySuccess = false;

                try {
                    await this.clickCopyToClipboard();
                    await this.sleep(1500); // Tăng thời gian chờ

                    clipboardContent = await this.driver.executeScript('return navigator.clipboard.readText();');
                    console.log('clipboard content');

                    if (clipboardContent && clipboardContent.trim()) {
                        copySuccess = true;
                        console.log('✅ Lấy nội dung từ clipboard thành công');
                    } else {
                        console.log('⚠️ Clipboard vẫn trống sau khi click Copy');
                    }
                } catch (copyError) {
                    console.log('❌ Lỗi khi copy to clipboard:', copyError.message);
                }

                // Nếu clipboard thất bại, thử download file
                if (!copySuccess || !clipboardContent) {
                    console.log('📥 Thử lấy kết quả bằng cách download file...');
                    try {
                        await this.clickDownloadButton();
                        await this.sleep(3000); // Chờ file download
                        const content = await this.readLatestTxtFileAndDelete();
                        console.log('📄 Đã lấy nội dung từ file download');
                        clipboardContent = content;
                        copySuccess = true;
                    } catch (downloadError) {
                        console.log('❌ Lỗi khi download file:', downloadError.message);
                    }
                }

                // Nếu cả clipboard và download đều thất bại
                if (!copySuccess || !clipboardContent) {
                    throw new Error('❌ Không thể lấy kết quả từ clipboard hoặc download, retrying...');
                }

                // Log clipboard content
                console.log(clipboardContent);

                // Extract JSON from string, removing everything outside {}
                const jsonMatch = clipboardContent.match(/\{.*\}/s);
                if (jsonMatch) {
                    clipboardContent = jsonMatch[0];
                } else {
                    // If no {} found, try to remove ``` markers first then search again
                    const cleanedContent = clipboardContent
                        .replace(/```[^`]*```/g, '')
                        .replace(/```/g, '')
                        .trim();
                    const secondMatch = cleanedContent.match(/\{.*\}/s);
                    if (secondMatch) {
                        clipboardContent = secondMatch[0];
                    }
                }

                resultData = clipboardContent;
                console.log('📋 Đã xử lý nội dung thành công');

                // xử lý result data, trả về định dạng json string, loại bỏ các phần tử nằm ngoài {}
                if (typeof resultData === 'string') {
                    try {
                        const jsonData = JSON.parse(resultData);
                        resultData = JSON.stringify(jsonData);
                    } catch (error) {
                        console.log('⚠️ Nội dung không phải JSON hợp lệ, giữ nguyên định dạng string');
                    }
                }
            }
            else {
                const contentBlocks = await this.driver.findElements(By.css('.markdown, .chat-turn-container'));
                if (contentBlocks.length === 0) {
                    throw new Error('❌ Không tìm thấy khối kết quả từ AI');
                }

                const finalBlock = contentBlocks[contentBlocks.length - 1];
                resultData = await finalBlock.getText();
                resultData = resultData.trim();


            }

            console.log('result data');
            console.log(resultData);
            console.log('end result data');

            const resultPayload = {
                request_id: requestId,
                status: 'completed',
                result_data: resultData,
            };

            console.log('📡 Gửi kết quả về server callback');
            await axios.post(callbackUrl, resultPayload);
        } catch (error) {
            console.log('❌ Lỗi xử lý:');
            console.error(error);
            throw error;
        }
    }

    async safeProcessPrompt(prompt, requestId, callbackUrl, temperature, type, maxRetries = 3) {
        // trước khi xử lý, gửi callback về cho server để thông báo đang xử lý
        const resultPayload = {
            request_id: requestId,
            status: 'processing',
            result_data: '',
        };

        console.log('📡 Gửi kết quả về server báo bắt đầu xử lý.');
        await axios.post(callbackUrl, resultPayload);

        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const chromeAlive = await this.checkChromeStatus();

                if (!chromeAlive) {
                    console.log('⚠️ Chrome đã chết → khởi động lại');
                    try {
                        if (this.driver) {
                            await this.driver.quit();
                        }
                    } catch (error) {
                        // Ignore quit errors
                    }
                    await this.initializeDriver();
                } else {
                    console.log('✅ Chrome vẫn đang chạy → refresh');
                }

                await this.processPrompt(prompt, requestId, callbackUrl, temperature, type);
                return;
            } catch (error) {
                retryCount++;
                console.log(`❌ Lỗi lần ${retryCount}: ${error.message}`);
                console.error(error);
                await this.sleep(3000);
            }
        }

        console.log(`❌ Thất bại sau ${maxRetries} lần thử`);
        await this.notifyError(callbackUrl, requestId, 'fail after 3 times');
    }

    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async quit() {
        if (this.driver) {
            await this.driver.quit();
        }

        // Don't clean up the profile directory since we want to reuse it
        // The profile will be preserved for the next run
        console.log('✅ Chrome driver closed, profile preserved for next run');
    }
}

module.exports = AiStudioWorker;
