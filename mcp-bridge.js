#!/usr/bin/env node
/**
 * MCP Bridge: Connects Claude Desktop (stdio) to Vercel HTTP API
 * This script translates MCP stdio protocol to HTTP API calls
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://virtual-printer-mcp.vercel.app';

// Parse URL to determine http vs https
const apiUrl = new URL(VERCEL_API_URL);
const httpModule = apiUrl.protocol === 'https:' ? https : http;

// Tools definition (must match server)
const TOOLS = [
    { name: 'print_document', description: 'Print a document', inputSchema: { type: 'object', properties: { documentName: { type: 'string' }, pageCount: { type: 'number' }, colorMode: { type: 'string', enum: ['color', 'grayscale', 'monochrome'] }, paperSize: { type: 'string' }, copies: { type: 'number' } }, required: ['documentName', 'pageCount'] } },
    { name: 'get_status', description: 'Get current printer status', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_queue', description: 'Get print queue', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_statistics', description: 'Get printer statistics', inputSchema: { type: 'object', properties: {} } },
    { name: 'cancel_job', description: 'Cancel a print job', inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'] } },
    { name: 'pause_printer', description: 'Pause the printer', inputSchema: { type: 'object', properties: {} } },
    { name: 'resume_printer', description: 'Resume the printer', inputSchema: { type: 'object', properties: {} } },
    { name: 'refill_ink_cartridge', description: 'Refill ink cartridge', inputSchema: { type: 'object', properties: { color: { type: 'string', enum: ['cyan', 'magenta', 'yellow', 'black'] } }, required: ['color'] } },
    { name: 'load_paper', description: 'Load paper', inputSchema: { type: 'object', properties: { count: { type: 'number' }, paperSize: { type: 'string' } }, required: ['count'] } },
    { name: 'clean_print_heads', description: 'Clean print heads', inputSchema: { type: 'object', properties: {} } },
    { name: 'clear_paper_jam', description: 'Clear paper jam', inputSchema: { type: 'object', properties: {} } },
    { name: 'reset_printer', description: 'Reset printer to defaults', inputSchema: { type: 'object', properties: {} } },
];

const RESOURCES = [
    { uri: 'printer://state', name: 'Printer State', mimeType: 'application/json' },
    { uri: 'printer://queue', name: 'Print Queue', mimeType: 'application/json' },
    { uri: 'printer://statistics', name: 'Statistics', mimeType: 'application/json' },
];

// Make HTTP request to Vercel API
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: apiUrl.hostname,
            port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        const req = httpModule.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Failed to parse response', raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Handle MCP requests
async function handleRequest(request) {
    const { id, method, params } = request;

    try {
        switch (method) {
            case 'initialize':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: { tools: {}, resources: {} },
                        serverInfo: { name: 'virtual-printer-bridge', version: '1.0.0' },
                    },
                };

            case 'tools/list':
                return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

            case 'resources/list':
                return { jsonrpc: '2.0', id, result: { resources: RESOURCES } };

            case 'tools/call': {
                const { name, arguments: args } = params;
                const result = await makeRequest('POST', `/api/mcp?type=tool&name=${name}`, { arguments: args || {} });
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [{ type: 'text', text: JSON.stringify(result.result || result, null, 2) }],
                    },
                };
            }

            case 'resources/read': {
                const uri = params.uri;
                const resourceName = uri.replace('printer://', '');
                const result = await makeRequest('GET', `/api/mcp?type=resource&name=${resourceName}`);
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        contents: [{
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(result.data || result, null, 2),
                        }],
                    },
                };
            }

            case 'notifications/initialized':
                return null; // No response needed for notifications

            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Method not found: ${method}` },
                };
        }
    } catch (error) {
        return {
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: error.message },
        };
    }
}

// Main: Read from stdin, write to stdout
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', async (line) => {
    try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        if (response) {
            console.log(JSON.stringify(response));
        }
    } catch (error) {
        console.error('Parse error:', error.message);
    }
});

process.stderr.write('Virtual Printer MCP Bridge started\n');
process.stderr.write(`Connecting to: ${VERCEL_API_URL}\n`);
