// API Base URL
const API_BASE = '';

// Global state
let eventSource = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    startRealtimeUpdates();
    loadStatistics();
    loadLogs();
});

// Initialize UI
function initializeUI() {
    console.log('Virtual Printer Dashboard initialized');
}

// Start real-time updates using Server-Sent Events
function startRealtimeUpdates() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`${API_BASE}/api/stream`);

    eventSource.onmessage = (event) => {
        try {
            const status = JSON.parse(event.data);
            updateDashboard(status);
        } catch (error) {
            console.error('Error parsing status update:', error);
        }
    };

    eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        // Try to reconnect after 5 seconds
        setTimeout(() => {
            startRealtimeUpdates();
        }, 5000);
    };
}

// Update dashboard with status data
function updateDashboard(status) {
    // Update status badge
    updateStatusBadge(status.status);

    // Update printer info
    document.getElementById('printerStatus').textContent = status.status;
    document.getElementById('printerModel').textContent = status.name || 'Virtual Inkjet Pro';
    document.getElementById('paperSize').textContent = status.paperSize || 'A4';

    // Update ink levels
    updateInkLevels(status.ink);

    // Update paper count
    document.getElementById('paperCount').textContent = status.paperCount;
    document.getElementById('paperCapacity').textContent = status.paperCapacity || 500;

    // Update current job
    if (status.currentJob) {
        showCurrentJob(status.currentJob);
    } else {
        hideCurrentJob();
    }

    // Update queue
    updateQueue(status.queue);

    // Update errors
    if (status.errors && status.errors.length > 0) {
        showErrors(status.errors);
    } else {
        hideErrors();
    }

    // Update button states
    updateControlButtons(status.status);
}

// Update status badge
function updateStatusBadge(status) {
    const badge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    
    badge.className = 'status-badge';
    statusText.textContent = status;

    if (status === 'offline' || status === 'error') {
        badge.classList.add('error');
    } else if (status === 'paused' || status === 'warming_up') {
        badge.classList.add('warning');
    }
}

// Update ink levels
function updateInkLevels(ink) {
    if (!ink) return;

    const colors = ['cyan', 'magenta', 'yellow', 'black'];
    colors.forEach(color => {
        const level = ink[color] || 0;
        const fillElement = document.getElementById(`ink${capitalize(color)}`);
        const percentElement = document.getElementById(`ink${capitalize(color)}Percent`);

        if (fillElement) {
            fillElement.style.width = `${level}%`;
        }
        if (percentElement) {
            percentElement.textContent = `${level.toFixed(1)}%`;
        }
    });
}

// Show current job
function showCurrentJob(job) {
    const currentJobElement = document.getElementById('currentJob');
    const documentElement = document.getElementById('jobDocument');
    const progressElement = document.getElementById('jobProgress');
    const progressFillElement = document.getElementById('progressFill');

    currentJobElement.style.display = 'block';
    documentElement.textContent = job.documentName || 'Unknown';
    progressElement.textContent = `${job.pagesPrinted || 0} / ${job.totalPages || 0} pages`;

    const progress = job.totalPages > 0 ? (job.pagesPrinted / job.totalPages) * 100 : 0;
    progressFillElement.style.width = `${progress}%`;
}

// Hide current job
function hideCurrentJob() {
    document.getElementById('currentJob').style.display = 'none';
}

// Update queue
function updateQueue(queue) {
    const queueCountElement = document.getElementById('queueCount');
    const queueListElement = document.getElementById('queueList');

    if (!queue || !queue.jobs) {
        queueCountElement.textContent = '0';
        queueListElement.innerHTML = '<p class="empty-message">No jobs in queue</p>';
        return;
    }

    queueCountElement.textContent = queue.jobs.length;

    if (queue.jobs.length === 0) {
        queueListElement.innerHTML = '<p class="empty-message">No jobs in queue</p>';
        return;
    }

    queueListElement.innerHTML = queue.jobs.map(job => `
        <div class="queue-item">
            <div class="queue-item-info">
                <strong>${job.documentName}</strong><br>
                <small>${job.pages} pages • ${job.quality} quality</small>
            </div>
            <button class="btn-small" onclick="cancelJob('${job.id}')">Cancel</button>
        </div>
    `).join('');
}

// Show errors
function showErrors(errors) {
    const errorSection = document.getElementById('errorSection');
    const errorList = document.getElementById('errorList');

    errorSection.style.display = 'block';
    errorList.innerHTML = errors.map(error => `
        <div class="error-item">
            <strong>${error.type}</strong>: ${error.message}
        </div>
    `).join('');
}

// Hide errors
function hideErrors() {
    document.getElementById('errorSection').style.display = 'none';
}

// Update control buttons
function updateControlButtons(status) {
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');

    if (status === 'paused') {
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
    } else {
        pauseBtn.disabled = false;
        resumeBtn.disabled = status === 'offline';
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/api/statistics`);
        const stats = await response.json();

        document.getElementById('totalPages').textContent = stats.totalPagesPrinted || 0;
        document.getElementById('completedJobs').textContent = stats.completedJobs || 0;
        document.getElementById('failedJobs').textContent = stats.failedJobs || 0;

        const total = (stats.completedJobs || 0) + (stats.failedJobs || 0);
        const successRate = total > 0 ? ((stats.completedJobs || 0) / total * 100).toFixed(1) : 0;
        document.getElementById('successRate').textContent = `${successRate}%`;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load logs
async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE}/api/logs?limit=50`);
        const data = await response.json();

        const logElement = document.getElementById('eventLog');
        if (data.logs && data.logs.length > 0) {
            logElement.innerHTML = data.logs.map(log => `
                <div class="log-entry ${log.level}">
                    <span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    ${log.message}
                </div>
            `).join('');
            logElement.scrollTop = logElement.scrollHeight;
        } else {
            logElement.innerHTML = '<p class="empty-message">No logs available</p>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Print document
async function submitPrint(event) {
    event.preventDefault();

    const documentName = document.getElementById('docName').value;
    const pages = parseInt(document.getElementById('pageCount').value);
    const color = document.getElementById('printColor').checked;
    const quality = document.getElementById('quality').value;
    const paperSize = document.getElementById('printPaperSize').value;

    try {
        const response = await fetch(`${API_BASE}/api/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentName, pages, color, quality, paperSize })
        });

        const result = await response.json();

        if (result.success) {
            showToast(`Print job submitted! Job ID: ${result.jobId}`, 'success');
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error submitting print job: ${error.message}`, 'error');
    }
}

// Cancel job
async function cancelJob(jobId) {
    try {
        const response = await fetch(`${API_BASE}/api/cancel/${jobId}`, {
            method: 'POST'
        });

        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error canceling job: ${error.message}`, 'error');
    }
}

// Pause printer
async function pausePrinter() {
    try {
        const response = await fetch(`${API_BASE}/api/pause`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error pausing printer: ${error.message}`, 'error');
    }
}

// Resume printer
async function resumePrinter() {
    try {
        const response = await fetch(`${API_BASE}/api/resume`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error resuming printer: ${error.message}`, 'error');
    }
}

// Refill ink
async function refillInk(color) {
    try {
        const response = await fetch(`${API_BASE}/api/refill/${color}`, {
            method: 'POST'
        });

        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error refilling ink: ${error.message}`, 'error');
    }
}

// Set ink level to specific value
async function setInkLevel(color) {
    const inputId = `ink${capitalize(color)}Input`;
    const inputElement = document.getElementById(inputId);
    const level = parseFloat(inputElement.value);

    if (isNaN(level) || level < 0 || level > 100) {
        showToast('Please enter a value between 0 and 100', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/set-ink/${color}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level })
        });

        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
        
        // Clear input after successful set
        if (result.success) {
            inputElement.value = '';
        }
    } catch (error) {
        showToast(`Error setting ink level: ${error.message}`, 'error');
    }
}

// Load paper
async function loadPaper() {
    const count = parseInt(document.getElementById('paperToLoad').value);
    const paperSize = document.getElementById('paperSizeSelect').value;

    try {
        const response = await fetch(`${API_BASE}/api/load-paper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, paperSize })
        });

        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error loading paper: ${error.message}`, 'error');
    }
}

// Clean heads
async function cleanHeads() {
    try {
        const response = await fetch(`${API_BASE}/api/clean`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error cleaning heads: ${error.message}`, 'error');
    }
}

// Align heads
async function alignHeads() {
    try {
        const response = await fetch(`${API_BASE}/api/align`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error aligning heads: ${error.message}`, 'error');
    }
}

// Nozzle check
async function nozzleCheck() {
    try {
        const response = await fetch(`${API_BASE}/api/nozzle-check`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error running nozzle check: ${error.message}`, 'error');
    }
}

// Clear jam
async function clearJam() {
    try {
        const response = await fetch(`${API_BASE}/api/clear-jam`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error clearing jam: ${error.message}`, 'error');
    }
}

// Power cycle
async function powerCycle() {
    if (!confirm('Power cycle the printer? This will take about 15 seconds.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/power-cycle`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showToast(`Error power cycling: ${error.message}`, 'error');
    }
}

// Reset printer
async function resetPrinter() {
    if (!confirm('Reset printer to factory defaults? This will clear all jobs, errors, and statistics. Are you sure?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
        const result = await response.json();
        showToast(result.message, result.success ? 'success' : 'error');
        
        // Reload statistics and logs after reset
        setTimeout(() => {
            loadStatistics();
            loadLogs();
        }, 1000);
    } catch (error) {
        showToast(`Error resetting printer: ${error.message}`, 'error');
    }
}

// Refresh logs
function refreshLogs() {
    loadLogs();
    showToast('Logs refreshed', 'success');
}

// Clear log display
function clearLogDisplay() {
    document.getElementById('eventLog').innerHTML = '<p class="empty-message">Logs cleared (refresh to reload)</p>';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper function to capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});
