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
            // const tempInput = await this.driver.wait(
            //     until.elementLocated(By.css('input.manual-input[type="number"]')),
            //     10000,
            // );

            // await this.driver.executeScript(
            //     `
            //     const input = arguments[0];
            //     const value = arguments[1];
            //     input.value = value;
            //     input.dispatchEvent(new Event('input', { bubbles: true }));
            //     input.dispatchEvent(new Event('change', { bubbles: true }));
            // `,
            //     tempInput,
            //     parseFloat(temperature),
            // );

            // set input has class="manual-input" and type="number"
            const tempInput = await this.driver.wait(
                until.elementLocated(By.css('input.manual-input[type="number"]')),
                10000,
            );
            await this.driver.executeScript(
                `
                const input = arguments[0];
                const value = arguments[1];
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            `,
                tempInput,
                parseFloat(temperature),
            );

            console.log(`✅ Đã set temperature = ${temperature}`);
        } catch (error) {
            console.log(`⚠️ Không set được temperature: ${error.message}`);
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
            // click button has mattooltip = Download
            const buttons = await this.driver.wait(
                until.elementsLocated(By.css('button[mattooltip="Download"]')),
                10000,
            );
            if (buttons.length > 0) {
                await buttons[0].click();
                console.log('✅ Đã click nút Download.');
            } else {
                console.log('❌ Không tìm thấy nút Download.');
            }
        } catch (error) {
            console.log('❌ Lỗi khi bấm nút Download:', error.message);
        }
    }

    async clickCopyToClipboard() {
        try {
            // const footers = await this.driver.wait(until.elementsLocated(By.css('footer .actions')), 10000);

            // for (const footer of footers) {
            //     const buttons = await footer.findElements(By.css('button'));
            //     for (const button of buttons) {
            //         const innerHTML = await button.getAttribute('innerHTML');
            //         if (innerHTML && innerHTML.includes('content_copy')) {
            //             await button.click();
            //             console.log('✅ Đã click nút Copy to clipboard.');
            //             return;
            //         }
            //     }
            // }

            // click button has mattooltip="Copy to clipboard"
            const copyButtons = await this.driver.wait(
                until.elementsLocated(By.css('button[mattooltip="Copy to clipboard"]')),
                10000,
            );
            if (copyButtons.length > 0) {
                await copyButtons[0].click();
                console.log('✅ Đã click nút Copy to clipboard.');
            } else {
                console.log('❌ Không tìm thấy nút Copy.');
            }
        } catch (error) {
            console.log('❌ Lỗi khi bấm nút Copy:', error.message);
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

            if (['stock', 'news', 'market'].includes(type)) {
                // xoa du lieu trong clipboard
                await this.driver.executeScript('navigator.clipboard.writeText("");');
                console.log('✅ Đã xóa clipboard trước khi lấy kết quả');
                console.log('📋 Đang lấy kết quả từ clipboard...');
                await this.clickCopyToClipboard();
                await this.sleep(1000);

                let clipboardContent = await this.driver.executeScript('return navigator.clipboard.readText();');
                console.log('clipboard content');
                // Nếu clipboardContent là rỗng thì quăng ra lỗi để hàm safe_processPrompt tự xử lý lại
                if (!clipboardContent) {
                    throw new Error('❌ Clipboard is empty, retrying...');
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

                if (!clipboardContent.startsWith('{') || !clipboardContent.endsWith('}')) {
                    console.log('❌ Clipboard không phải JSON hợp lệ, thử click nút Download');
                    await this.clickDownloadButton();
                    await this.sleep(2000);
                    const content = await this.readLatestTxtFileAndDelete();
                    console.log('📄 Nội dung file:');
                    console.log(content);
                    resultData = content;
                } else {
                    resultData = clipboardContent;
                    console.log('📋 Đã lấy nội dung từ clipboard');
                }
                // xử lý result data, trả về định dạng json string, loại bỏ các phần tử nằm ngoài {}
                if (typeof resultData === 'string') {
                    try {
                        const jsonData = JSON.parse(resultData);
                        resultData = JSON.stringify(jsonData);
                    } catch (error) {
                        console.log('❌ Nội dung không phải JSON hợp lệ');
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
                // nếu type là 'restructure' thì xử lý kết quả html
                if (type === 'restructure') {
                    // resultData là 1 chuỗi string bao gồm text và các html string.
                    // trong resultData chỉ lấy các ký tự từ thẻ div có id="restructure" tới hết thẻ div tương ứng.
                    const $ = cheerio.load(resultData);
                    const restructureDiv = $('#restructure');
                    if (restructureDiv.length === 0) {
                        throw new Error('❌ Không tìm thấy thẻ <div id="restructure"> trong kết quả');
                    }
                    // Lấy cả thẻ div bao gồm cả tag <div id="restructure"> và nội dung bên trong
                    resultData = $.html(restructureDiv);
                    if (!resultData) {
                        throw new Error('❌ Không tìm thấy nội dung trong thẻ <div id="restructure">');
                    }
                    
                    // Loại bỏ tất cả text nodes không nằm trong thẻ HTML nào
                    const cleanedHtml = cheerio.load(resultData);
                    
                    // Chiến lược: Chỉ giữ lại text nodes nằm trong các thẻ HTML có ý nghĩa
                    // và loại bỏ tất cả text nodes ở cấp độ cao (body, html, root)
                    
                    // 1. Loại bỏ tất cả text nodes trực tiếp con của body
                    cleanedHtml('body').contents().filter(function() {
                        return this.type === 'text';
                    }).remove();
                    
                    // 2. Loại bỏ tất cả text nodes trực tiếp con của html
                    cleanedHtml('html').contents().filter(function() {
                        return this.type === 'text';
                    }).remove();
                    
                    // 3. Loại bỏ tất cả text nodes ở root level
                    cleanedHtml.root().contents().filter(function() {
                        return this.type === 'text';
                    }).remove();
                    
                    // 4. Loại bỏ text nodes trực tiếp con của div#restructure (không nằm trong thẻ con)
                    cleanedHtml('#restructure').contents().filter(function() {
                        return this.type === 'text';
                    }).remove();
                    
                    // 5. Loại bỏ text nodes trống hoặc chỉ chứa whitespace
                    cleanedHtml('*').contents().filter(function() {
                        return this.type === 'text' && !this.data.trim();
                    }).remove();
                    
                    // 6. Loại bỏ text nodes không có parent là thẻ có ý nghĩa (p, h1, h2, h3, li, span, strong, em, div với class/style)
                    cleanedHtml('*').contents().filter(function() {
                        if (this.type !== 'text') return false;
                        if (!this.data.trim()) return true; // Loại bỏ text trống
                        
                        const parent = this.parent;
                        if (!parent || !parent.name) return true; // Loại bỏ nếu không có parent tag
                        
                        // Danh sách các thẻ được phép chứa text có ý nghĩa
                        const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'strong', 'em', 'b', 'i', 'u', 'a', 'td', 'th', 'label'];
                        
                        // Chỉ giữ text nếu parent là thẻ được phép, hoặc là div có class/style (có format)
                        const isAllowedTag = allowedTags.includes(parent.name);
                        const isDivWithAttributes = parent.name === 'div' && (parent.attribs.class || parent.attribs.style);
                        
                        return !(isAllowedTag || isDivWithAttributes);
                    }).remove();
                    
                    resultData = cleanedHtml.html();
                    
                    
                }

                // trường hợp này đang trả về html string, với inline css
                // Xử lý kết quả HTML, loại bỏ cá phần tử ko thuộc html
                
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
