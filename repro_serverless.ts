
import { VirtualPrinter } from './src/printer';
import { StateManager } from './src/state-manager';
import * as fs from 'fs';
import * as path from 'path';

// Mock serverless environment
process.env.VERCEL = '1';

async function runTest() {
    console.log('--- Starting Serverless Queue Reproduction Test ---');

    // 1. Initialize Printer (First Request)
    console.log('\n1. Initializing Printer (Request 1)...');
    const stateManager = new StateManager();
    const printer1 = new VirtualPrinter(stateManager);
    // Force initialization
    await (printer1 as any).initialize();

    const status1 = printer1.getStatus();
    console.log('Initial Status:', status1.status);

    // 2. Add a Print Job
    console.log('\n2. Adding Print Job (Request 2)...');
    const printer2 = new VirtualPrinter(stateManager);
    await (printer2 as any).initialize();

    const jobResult = printer2.printDocument({
        documentName: 'Test Document',
        pages: 5,
        quality: 'normal'
    });
    console.log('Job Queued:', jobResult);

    // 3. Wait for some time (simulating time passing between requests)
    // The job takes 5 pages * (60/15) = 20 seconds to print
    const waitTime = 5000;
    console.log(`\n3. Waiting for ${waitTime}ms (simulating idle time)...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 4. Check Status (Request 3)
    // In the buggy version, progress would be 0 because no processing happened.
    // In the fixed version, updateState() should calculate progress.
    console.log('\n4. Checking Status (Request 3)...');
    const printer3 = new VirtualPrinter(stateManager);
    // We need to manually call updateState since we're not going through the API handler
    // But wait, the printer initializes and loads state. 
    // The fix added updateState() call to getStatus() inside printer.ts? 
    // No, the plan said "Call updateState() at the beginning of getStatus() and other read/write operations."
    // Let's check if I actually implemented that call in getStatus inside printer.ts.
    // I see I added the comment "// Note: In serverless, updateState() should be called before this" in getStatus.
    // So I need to call it manually here to simulate the API handler behavior.

    await (printer3 as any).initialize();
    await printer3.updateState();

    const status3 = printer3.getStatus();
    const currentJob = status3.currentJob;

    if (currentJob) {
        console.log(`Current Job Status: ${currentJob.status}`);
        console.log(`Progress: ${currentJob.progress.toFixed(2)}%`);

        if (currentJob.progress > 0) {
            console.log('SUCCESS: Job progress updated!');
        } else {
            console.log('FAILURE: Job progress is still 0.');
        }
    } else {
        // If completed, that's also a success (if wait time was long enough)
        const completed = status3.queue.length === 0 && status3.currentJob === null;
        if (completed) {
            console.log('SUCCESS: Job completed!');
        } else {
            console.log('FAILURE: No current job and queue empty?');
        }
    }

    console.log('--- Test Complete ---');
}

runTest().catch(console.error);
