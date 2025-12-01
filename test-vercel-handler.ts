/**
 * Test script to verify Vercel handler updateState() fix
 * This simulates a print job being submitted and then checked after time has elapsed
 */

import { VirtualPrinter } from '../build/printer.js';
import { StateManager } from '../build/state-manager.js';

async function testVercelStateUpdate() {
    console.log('=== Testing Vercel State Update Fix ===\n');

    // Create printer instance
    const stateManager = new StateManager();
    const printer = new VirtualPrinter(stateManager);

    await printer.ensureInitialized();
    console.log('✓ Printer initialized');

    // Reset to clean state
    await printer.reset();
    console.log('✓ Printer reset to defaults');

    // Submit a print job
    const result = printer.printDocument({
        documentName: 'Test Document',
        pages: 5,
        color: true,
        quality: 'normal'
    });

    console.log(`✓ Print job submitted: ${result.jobId}`);
    console.log(`  Estimated time: ${result.estimatedTime}s\n`);

    // Get initial status
    let status = printer.getStatus();
    console.log('Initial Status:');
    console.log(`  Status: ${status.status}`);
    console.log(`  Queue length: ${status.queue.length}`);
    console.log(`  Current job: ${status.currentJob?.documentName || 'none'}`);
    console.log(`  Progress: ${status.currentJob?.progress || 0}%\n`);

    // Simulate time passing (wait 3 seconds)
    console.log('⏳ Waiting 3 seconds to simulate elapsed time...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Call updateState() - this is what the Vercel handler now does
    console.log('Calling updateState() (simulating Vercel handler behavior)...');
    await printer.updateState();
    console.log('✓ State updated\n');

    // Get updated status
    status = printer.getStatus();
    console.log('Updated Status:');
    console.log(`  Status: ${status.status}`);
    console.log(`  Queue length: ${status.queue.length}`);
    console.log(`  Current job: ${status.currentJob?.documentName || 'none'}`);
    console.log(`  Progress: ${status.currentJob?.progress || 0}%\n`);

    // Verify progress increased
    if (status.currentJob && status.currentJob.progress > 0) {
        console.log('✅ SUCCESS: Job progress updated based on elapsed time!');
        console.log(`   Progress went from 0% to ${Math.round(status.currentJob.progress)}%`);
    } else {
        console.log('❌ FAILURE: Job progress did not update');
        console.log('   This indicates updateState() is not working correctly');
    }

    // Wait for job to complete
    const estimatedTime = result.estimatedTime;
    console.log(`\n⏳ Waiting ${estimatedTime} seconds for job to complete...\n`);
    await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));

    await printer.updateState();
    status = printer.getStatus();

    console.log('Final Status:');
    console.log(`  Status: ${status.status}`);
    console.log(`  Queue length: ${status.queue.length}`);
    console.log(`  Current job: ${status.currentJob?.documentName || 'none'}`);
    console.log(`  Total pages printed: ${status.statistics?.totalPagesPrinted || 0}\n`);

    if (status.status === 'ready' && status.queue.length === 0) {
        console.log('✅ SUCCESS: Job completed successfully!');
    } else {
        console.log('⚠️  Job may still be in progress or encountered an error');
    }
}

// Run the test
testVercelStateUpdate().catch(console.error);
