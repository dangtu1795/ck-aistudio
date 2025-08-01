# AI Studio Worker - Node.js Version

A Node.js conversion of the Python Flask server and Selenium worker for automating AI Studio interactions.

## Features

- Express.js server with simple routing
- Selenium WebDriver automation for Chrome
- Job queue management
- Support for multiple request types (stock, news, market, checknews, asset)
- Error handling and retry mechanisms
- Temperature control for AI responses

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure you have Chrome browser installed on your system.

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://0.0.0.0:6000`

## API Endpoints

### POST /test
Test endpoint that logs the request body.

### GET /status
Check the status of the Chrome browser and server.

### POST /submit
Submit a prompt for processing.

**Request body:**
```json
{
  "prompt": "Your prompt here",
  "request_id": "unique_request_id",
  "callback_url": "http://your-callback-url",
  "type": "stock|news|market|checknews|asset",
  "temperature": 0.7
}
```

## Project Structure

- `server.js` - Express server with routing
- `ai-studio-worker.js` - Main worker class for Selenium automation
- `utils/queue.js` - Simple queue implementation for job management
- `package.json` - Node.js dependencies and scripts

## Dependencies

- **express**: Web framework for Node.js
- **selenium-webdriver**: WebDriver bindings for Node.js
- **cheerio**: Server-side implementation of jQuery for HTML parsing
- **axios**: HTTP client for API requests
- **fs-extra**: Enhanced file system operations
- **chrome-launcher**: Chrome launcher utilities

## Notes

- The server automatically handles Chrome browser lifecycle
- Failed requests are retried up to 3 times
- Debug files are saved when button clicks fail
- Temperature values are automatically set for AI responses
