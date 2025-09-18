// SnapLogic Sizing Calculator - JavaScript

// --- Central Configuration Object ---
const configurationOptions = {
    ha: {
        bufferMultiplier: 1.3,
        minNodes: 2,
    },
    triggered: {
        requestsPerNodePerSecond: 20,
        complexityResponseTimes: {
            simple: 1,
            moderate: 2.5,
            complex: 4.0,
            veryComplex: 12.0
        }
    },
    ultra: {
        exec: {
            requestsPerNodePerSecond: 100,
        },
        fm: {
            ratio: 0.5 // FeedMasters are 50% of Execution nodes
        },
        complexityResponseTimes: {
            simple: 0.3,
            moderate: 1.0,
            complex: 2.5,
            veryComplex: 5.0
        }
    },
    scheduled: {
        mbPerMinutePerNode: 300,
        rowsToGbDivisor: 5000000,
        complexityMultipliers: {
            simple: 1,
            moderate: 1.25,
            complex: 1.5,
            veryComplex: 2
        }
    },
    headless: {
        mbPerMinutePerNode: 150,
        bytesToGbEqDivisor: 10000000000,
        requestsPerNodePerSecond: 100,
        assumedResponseTime: 0.3,
        complexityMultipliers: {
            simple: 1,
            moderate: 1.25,
            complex: 1.5,
            veryComplex: 2
        }
    }
};

const EXPORT_EXPLANATIONS = {
    purpose: "This document provides a SnapLogic infrastructure sizing estimation. Its goal is to translate business transaction volumes into a recommended number of SnapLogic execution nodes required to process the workload reliably and efficiently.",
    benefitToCustomer: "Proper infrastructure sizing is crucial for ensuring performance, reliability, and cost-effectiveness. By using this data-driven approach, the customer can avoid under-provisioning, which leads to performance bottlenecks and failed processes, and over-provisioning, which results in unnecessary costs. This estimation provides a solid foundation for architectural planning, ensuring the platform can meet Service Level Agreements (SLAs) from day one and scale effectively as business needs grow.",
    methodology: "The calculation methodology is based on established SnapLogic performance benchmarks. It starts by converting the customer's stated business volume (e.g., 'API calls per year') into a peak transactions-per-second rate, factoring in the customer's specific operational window (days per month, hours per day) and expected peak load variance. This peak transaction rate is then divided by the benchmarked processing capacity of a single SnapLogic node for the given workload type (e.g., Triggered, Ultra, Scheduled). The result is the raw number of nodes required, which is then used to recommend both a non-redundant (Non-HA) and a fault-tolerant (High Availability/HA) configuration.",
    keyConcepts: {
        "Node": "A Node is the fundamental unit of computation in SnapLogic. It is a Java Virtual Machine (JVM) process that executes integration pipelines. A collection of nodes forms a Snaplex (execution cluster).",
        "High Availability (HA)": "An HA configuration includes redundant nodes (typically a 30% buffer and a minimum of 2-3 nodes) to ensure the system remains operational even if one node fails. This is critical for production and business-critical workloads.",
        "Peak Load": "The maximum expected workload, calculated as a percentage increase over the average load. Sizing for peak load ensures the system can handle bursts of activity without performance degradation.",
        "Effective Throughput": "The actual number of transactions a node can process per second. This is influenced by the average response time of the tasks; faster tasks allow a single node to process more transactions per second."
    },
    glossary: {
        triggered: {
            inputs: {
                apiRequests: "The total number of API requests the customer expects to process over the specified time unit.",
                coverageDays: "The number of days per month the workload is active (e.g., 22 for business days, 30 for 24/7 operations).",
                coverageHours: "The number of hours per day the workload is active.",
                peakLoadPercentage: "The percentage increase over the average load during peak times (e.g., 150% means the peak is 1.5x the average).",
                complexity: "The selected complexity level which determines the assumed average response time for a single task."
            },
            outputs: {
                assumedResponseTime: "The average response time in seconds based on the selected complexity.",
                avgRequestsPerSecond: "The calculated average number of requests per second during the active window.",
                peakRequestsPerSecond: "The calculated peak number of requests per second.",
                effectiveThroughputPerNode: "The number of requests a single standard Triggered node can handle per second, based on the assumed response time.",
                rawNodesRequired: "The theoretical (fractional) number of nodes required to handle the peak load.",
                nodesRequiredNonHA: "The number of nodes required (rounded up) without a high-availability buffer.",
                nodesRequiredHA: "The recommended number of nodes including a buffer for high availability and a minimum node count.",
                maxCapacityHA: "The maximum requests per second the HA node configuration can handle.",
                headroomVsPeak: "The percentage of extra capacity the HA configuration provides over the peak load.",
                headroomVsAverage: "The percentage of extra capacity the HA configuration provides over the average load."
            }
        },
        ultra: {
            inputs: {
                apiRequests: "The total number of API requests the customer expects to process over the specified time unit for low-latency Ultra pipelines.",
                coverageDays: "The number of days per month the workload is active.",
                coverageHours: "The number of hours per day the workload is active.",
                peakLoadPercentage: "The percentage increase over the average load during peak times.",
                complexity: "The selected complexity level which determines the assumed average response time for a single task."
            },
            outputs: {
                assumedResponseTime: "The average response time in seconds based on the selected complexity.",
                avgRequestsPerSecond: "The calculated average number of requests per second during the active window.",
                peakRequestsPerSecond: "The calculated peak number of requests per second.",
                effectiveThroughputPerExecNode: "The number of requests a single Ultra Execution node can handle per second, based on the assumed response time.",
                execNodesNonHA: "The calculated number of Execution nodes required (non-HA).",
                execNodesHA: "The recommended number of Execution nodes for high availability.",
                fmNodesNonHA: "The calculated number of FeedMaster nodes required, based on a 50% ratio of Execution nodes (non-HA).",
                fmNodesHA: "The recommended number of FeedMaster nodes for high availability, based on a 50% ratio of Execution nodes (HA).",
                maxCapacityHA: "The maximum requests per second the HA Execution node configuration can handle.",
                headroomVsPeak: "The percentage of extra capacity the HA configuration provides over the peak load.",
                headroomVsAverage: "The percentage of extra capacity the HA configuration provides over the average load."
            }
        },
        scheduled: {
            inputs: {
                batchSize: "The total data volume (in GB or millions of rows) to be processed in a single batch.",
                processWindowHours: "The available time in hours to complete the batch processing.",
                complexityMultiplier: "A factor representing the transformation complexity of the pipeline (e.g., simple pass-through vs. complex aggregations)."
            },
            outputs: {
                requiredThroughput: "The calculated data processing speed (in MB/minute) required to meet the batch window.",
                rawNodesRequired: "The theoretical (fractional) number of nodes required.",
                nodesRequiredNonHA: "The number of nodes required (rounded up) without a high-availability buffer.",
                nodesRequiredHA: "The recommended number of nodes including a buffer for high availability.",
                maxCapacityHA: "The maximum throughput the HA node configuration can handle.",
                headroom: "The percentage of extra capacity the HA configuration provides."
            }
        },
        headless: {
           eventFrequency: {
                inputs: {
                    eventVolume: "Total number of events within the specified time unit for headless pipelines.",
                    coverageHours: "The number of hours per day the workload is active.",
                    peakLoadPercentage: "The percentage increase over the average load during peak times."
                },
                outputs: {
                   avgEventsPerSecond: "The calculated average number of events per second.",
                   peakEventsPerSecond: "The calculated peak number of events per second.",
                   effectiveThroughputPerNode: "The number of events a single headless node can handle per second.",
                   execNodesNonHA: "Calculated number of Execution nodes required (non-HA).",
                   execNodesHA: "Recommended number of Execution nodes for high availability.",
                   maxCapacityHA: "The maximum events per second the HA node configuration can handle.",
                   headroomVsPeak: "Extra capacity over peak load.",
                   headroomVsAverage: "Extra capacity over average load."
                }
           },
           dataVolume: {
                inputs: {
                   eventVolumePerDay: "Total number of events per day.",
                   avgMessageSizeBytes: "The average size of a single event message in bytes.",
                   coverageHours: "The number of hours per day the workload is active.",
                   peakLoadPercentage: "The percentage increase over the average load during peak times.",
                   complexityMultiplier: "A factor representing the transformation complexity."
                },
                outputs: {
                   avgThroughput: "The calculated average data throughput in MB/minute.",
                   peakThroughput: "The calculated peak data throughput in MB/minute.",
                   execNodesNonHA: "Calculated number of Execution nodes required (non-HA).",
                   execNodesHA: "Recommended number of Execution nodes for high availability.",
                   maxCapacityHA: "The maximum throughput the HA node configuration can handle.",
                   headroomVsPeak: "Extra capacity over peak load.",
                   headroomVsAverage: "Extra capacity over average load."
                }
           }
        }
    }
};

// --- Core UI Functions ---
let activeTab = 'triggered';

function openTab(event, tabName) {
    activeTab = tabName;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function toggleDetailedView() {
    // Check if any detailed view toggle is checked
    const toggles = [
        'detailed-view-toggle',
        'detailed-view-toggle-ultra',
        'detailed-view-toggle-scheduled',
        'detailed-view-toggle-headless'
    ];

    const anyChecked = toggles.some(id => {
        const element = document.getElementById(id);
        return element && element.checked;
    });

    // Sync all toggles to the same state
    const currentToggle = event?.target;
    if (currentToggle) {
        toggles.forEach(id => {
            const element = document.getElementById(id);
            if (element && element !== currentToggle) {
                element.checked = currentToggle.checked;
            }
        });
    }

    // Apply the detailed view state
    if (anyChecked) {
        document.body.classList.add('detailed-view-active');
    } else {
        document.body.classList.remove('detailed-view-active');
    }
}

// --- Unit Conversion Logic ---
let currentUnits = {
    triggered: 'perYear',
    ultra: 'perYear',
    headless: 'perDay'
};

// Track which calculations have been performed
let calculationState = {
    triggered: false,
    ultra: false,
    scheduled: false,
    headless: false,
    prediction: false
};

function updateUnit(button, newUnit) {
    const selector = button.closest('.unit-selector');
    const calculatorType = selector.dataset.calculator;
    const inputId = selector.dataset.target;
    const inputElement = document.getElementById(inputId);

    // Get current unit and value
    const oldUnit = currentUnits[calculatorType];
    const currentValue = parseFloat(inputElement.value) || 0;

    // Convert current value to new unit
    if (currentValue > 0 && oldUnit !== newUnit) {
        const convertedValue = convertBetweenUnits(currentValue, oldUnit, newUnit);
        inputElement.value = Math.round(convertedValue);
    }

    // Update UI
    selector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update stored unit
    currentUnits[calculatorType] = newUnit;

    // Auto-recalculate if this calculation has been performed before
    if (calculationState[calculatorType]) {
        triggerCalculation(calculatorType);
    }
}

function convertBetweenUnits(value, fromUnit, toUnit) {
    // Conversion factors to "per second" as base unit
    const toPerSecondFactors = {
        'perSecond': 1,
        'perMinute': 1/60,
        'perHour': 1/3600,
        'perDay': 1/(24 * 3600),
        'perMonth': 1/(30 * 24 * 3600), // 30 days
        'perYear': 1/(360 * 24 * 3600)  // 360 days
    };

    // Convert to per-second, then to target unit
    const perSecond = value * toPerSecondFactors[fromUnit];
    const converted = perSecond / toPerSecondFactors[toUnit];

    return converted;
}

function triggerCalculation(calculatorType) {
    switch(calculatorType) {
        case 'triggered':
            calculateTriggered();
            break;
        case 'ultra':
            calculateUltra();
            break;
        case 'scheduled':
            calculateScheduled();
            break;
        case 'headless':
            calculateHeadlessUltra();
            break;
        case 'prediction':
            calculatePrediction();
            break;
    }
}

function getAverageRequestsPerSecond(value, unit, coverageDays, coverageHours) {
    if (isNaN(value) || value === 0 || isNaN(coverageDays) || coverageDays === 0 || isNaN(coverageHours) || coverageHours === 0) return 0;

    switch (unit) {
        case 'perSecond': return value;
        case 'perMinute': return value / 60;
        case 'perHour':   return value / 3600;
        case 'perDay':    return value / (coverageHours * 3600);
        case 'perMonth':  return value / (coverageDays * coverageHours * 3600);
        case 'perYear':   return value / (360 * coverageHours * 3600);
        default: return 0;
    }
}

// --- Scheduled/Headless Task UI Toggles ---
function toggleBatchMode() {
    const isChecked = document.getElementById('toggle-switch-scheduled').checked;
    const label = document.getElementById('batch-size-label');
    const input = document.getElementById('batch-size');
    if (isChecked) { // Switched to Rows
        label.textContent = 'Batch Volume (Rows)';
        input.value = 1500000000;
    } else { // Switched to GB
        label.textContent = 'Batch Size (GB)';
        input.value = 300;
    }
}

function toggleHeadlessMode() {
    const isChecked = document.getElementById('toggle-switch-headless').checked;
    const onDiv = document.getElementById('headless-microbatching-on');
    const offDiv = document.getElementById('headless-microbatching-off');

    if (isChecked) { // Microbatching ON (Event Frequency)
        onDiv.classList.remove('hidden');
        offDiv.classList.add('hidden');
    } else { // Microbatching OFF (Data Volume)
        onDiv.classList.add('hidden');
        offDiv.classList.remove('hidden');
    }
}

function generateResultCard(title, results, details, detailsExtra = null) {
    let detailsHtml = '<div class="result-grid">';
    details.forEach(detail => {
        detailsHtml += `
            <div class="data-card">
                <p class="data-label">${detail.label}</p>
                <p class="data-value">${detail.value}</p>
            </div>
        `;
    });
    detailsHtml += '</div>';

    let extraDetailsHtml = '';
    if (detailsExtra) {
        let headroomAvgHtml = '';
        if (detailsExtra.avg) {
             headroomAvgHtml = `
                <div class="data-card">
                    <p class="data-label">${detailsExtra.avg.label}</p>
                    <p class="data-value" style="color: #059669;">+${detailsExtra.avg.value}%</p>
                </div>
            `;
        }

        extraDetailsHtml = `
            <div class="detailed-view-content">
                <h4 class="section-title">Maximum Capacity of Calculated HA Nodes</h4>
                <div class="result-grid">
                    <div class="data-card">
                        <p class="data-label">${detailsExtra.raw.label}</p>
                        <p class="data-value">${detailsExtra.raw.value}</p>
                    </div>
                    <div class="data-card">
                        <p class="data-label">${detailsExtra.peak.label}</p>
                        <p class="data-value" style="color: #059669;">+${detailsExtra.peak.value}%</p>
                    </div>
                    ${headroomAvgHtml}
                </div>
            </div>
        `;
    }

    let resultsHtml = `<div class="result-grid primary-results">`;
    results.forEach(result => {
        resultsHtml += `
            <div class="data-card primary-result">
                <p class="data-label">${result.label}</p>
                <p class="data-value primary">${result.value}</p>
            </div>
        `;
    });
    resultsHtml += `</div>`;

    return `
        <div class="result-card">
            <h3 class="result-title">${title}</h3>
            ${detailsHtml}
            ${extraDetailsHtml}
            ${resultsHtml}
        </div>
    `;
}

function generatePredictionResultCard(title, headers, dataRows) {
    let tableHtml = `<table class="data-table">
        <thead class="table-header">
            <tr>`;
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    dataRows.forEach(row => {
        tableHtml += `<tr class="table-row">`;
        row.forEach((cell, index) => {
            if (index === 0) {
                tableHtml += `<th class="table-cell table-cell-header">${cell}</th>`;
            } else {
                tableHtml += `<td class="table-cell">${cell}</td>`;
            }
        });
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table>`;

    return `
        <div class="result-card">
            <h3 class="result-title">${title}</h3>
            ${tableHtml}
        </div>
    `;
}

// --- Calculation Functions ---
function getTriggeredCalculationResults(){
    const config = configurationOptions;
    const requests = parseFloat(document.getElementById('api-requests-triggered').value) || 0;
    const unit = currentUnits.triggered;
    const coverageDays = parseFloat(document.getElementById('coverage-days-triggered').value) || 30;
    const coverageHours = parseFloat(document.getElementById('coverage-hours-triggered').value) || 24;
    const peak = parseFloat(document.getElementById('peak-triggered').value) || 100;
    const complexity = document.getElementById('complexity-triggered').value;
    const assumedResponseTime = config.triggered.complexityResponseTimes[complexity];

    const avgRequestsPerSecond = getAverageRequestsPerSecond(requests, unit, coverageDays, coverageHours);
    const concurrentAPI = avgRequestsPerSecond * (peak / 100);

    const effectiveNodeThroughput = assumedResponseTime > 0 ? (config.triggered.requestsPerNodePerSecond / assumedResponseTime) : 0;
    const nodesRequired = effectiveNodeThroughput > 0 ? concurrentAPI / effectiveNodeThroughput : Infinity;

    const nonHaNodesRequired = Math.ceil(nodesRequired);
    const haNodesRequired = Math.ceil(Math.max(nodesRequired * config.ha.bufferMultiplier, config.ha.minNodes));

    const maxCapacity = haNodesRequired * effectiveNodeThroughput;
    const capacityHeadroomPeak = concurrentAPI > 0 ? ((maxCapacity / concurrentAPI) - 1) * 100 : 0;
    const capacityHeadroomAvg = avgRequestsPerSecond > 0 ? ((maxCapacity / avgRequestsPerSecond) - 1) * 100 : 0;

    return {
        inputs: {
            requests, unit, coverageDays, coverageHours, peak, complexity, assumedResponseTime
        },
        outputs: {
            avgRequestsPerSecond, concurrentAPI, effectiveNodeThroughput, nodesRequired,
            nonHaNodesRequired, haNodesRequired, maxCapacity, capacityHeadroomPeak, capacityHeadroomAvg
        }
    };
}

function calculateTriggered() {
    // Mark calculation as performed
    calculationState.triggered = true;

    const { outputs } = getTriggeredCalculationResults();

    const details = [
        { label: 'Avg. Concurrent API Requests', value: `${outputs.avgRequestsPerSecond.toFixed(2)} / sec`},
        { label: 'Peak Concurrent API Requests', value: `${outputs.concurrentAPI.toFixed(2)} / sec`},
        { label: 'Effective Throughput / Node', value: `${outputs.effectiveNodeThroughput.toFixed(2)} / sec`},
        { label: 'Raw Nodes Required', value: outputs.nodesRequired.toFixed(2) }
    ];

    const results = [
         { label: 'Nodes Required (Non-HA)', value: outputs.nonHaNodesRequired },
         { label: 'Nodes Required (HA)', value: outputs.haNodesRequired }
    ];

    const detailsExtra = {
        raw: { label: 'Max Concurrent Requests', value: `${outputs.maxCapacity.toFixed(2)} / sec` },
        peak: { label: 'Headroom vs. Peak', value: outputs.capacityHeadroomPeak.toFixed(1) },
        avg: { label: 'Headroom vs. Average', value: outputs.capacityHeadroomAvg.toFixed(1) }
    };

    document.getElementById('result-triggered').innerHTML = generateResultCard(
        'Triggered Task Sizing',
        results,
        details,
        detailsExtra
    );
}

function getUltraCalculationResults() {
    const config = configurationOptions;
    const requests = parseFloat(document.getElementById('api-requests-ultra').value) || 0;
    const unit = currentUnits.ultra;
    const coverageDays = parseFloat(document.getElementById('coverage-days-ultra').value) || 20;
    const coverageHours = parseFloat(document.getElementById('coverage-hours-ultra').value) || 12;
    const peak = parseFloat(document.getElementById('peak-ultra').value) || 100;
    const complexity = document.getElementById('complexity-ultra').value;
    const assumedResponseTime = config.ultra.complexityResponseTimes[complexity];

    const avgRequestsPerSecond = getAverageRequestsPerSecond(requests, unit, coverageDays, coverageHours);
    const concurrentAPI = avgRequestsPerSecond * (peak / 100);

    const effectiveExecNodeThroughput = assumedResponseTime > 0 ? (config.ultra.exec.requestsPerNodePerSecond / assumedResponseTime) : 0;
    const execNodes = effectiveExecNodeThroughput > 0 ? concurrentAPI / effectiveExecNodeThroughput : Infinity;
    const nonHaExecNodes = Math.ceil(execNodes);
    const haExecNodes = Math.ceil(Math.max(execNodes * config.ha.bufferMultiplier, config.ha.minNodes));

    const fmNodes = execNodes * config.ultra.fm.ratio;
    const nonHaFmNodes = Math.ceil(fmNodes);
    const haFmNodes = Math.ceil(Math.max(fmNodes * config.ha.bufferMultiplier, config.ha.minNodes));

    const maxCapacity = haExecNodes * effectiveExecNodeThroughput;
    const capacityHeadroomPeak = concurrentAPI > 0 ? ((maxCapacity / concurrentAPI) - 1) * 100 : 0;
    const capacityHeadroomAvg = avgRequestsPerSecond > 0 ? ((maxCapacity / avgRequestsPerSecond) - 1) * 100 : 0;

    return {
        inputs: { requests, unit, coverageDays, coverageHours, peak, complexity, assumedResponseTime },
        outputs: {
            avgRequestsPerSecond, concurrentAPI, effectiveExecNodeThroughput, execNodes, nonHaExecNodes, haExecNodes,
            fmNodes, nonHaFmNodes, haFmNodes, maxCapacity, capacityHeadroomPeak, capacityHeadroomAvg
        }
    };
}

function calculateUltra() {
    // Mark calculation as performed
    calculationState.ultra = true;

    const { outputs } = getUltraCalculationResults();

    const detailedViewHtml = `
        <div class="detailed-view-content">
            <h4 class="section-title">Maximum Capacity of Calculated HA Nodes</h4>
            <div class="result-grid">
                <div class="data-card">
                    <p class="data-label">Max Concurrent Requests</p>
                    <p class="data-value">${outputs.maxCapacity.toFixed(2)} / sec</p>
                </div>
                <div class="data-card">
                    <p class="data-label">Headroom vs. Peak</p>
                    <p class="data-value" style="color: #059669;">+${outputs.capacityHeadroomPeak.toFixed(1)}%</p>
                </div>
                <div class="data-card">
                    <p class="data-label">Headroom vs. Average</p>
                    <p class="data-value" style="color: #059669;">+${outputs.capacityHeadroomAvg.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    `;

    const resultHTML = `
        <div class="result-card">
            <h3 class="result-title">Ultra Task Sizing</h3>
            <div class="result-grid">
                 <div class="data-card">
                    <p class="data-label">Avg. Concurrent Requests</p>
                    <p class="data-value">${outputs.avgRequestsPerSecond.toFixed(2)} / sec</p>
                </div>
                <div class="data-card">
                    <p class="data-label">Peak Concurrent Requests</p>
                    <p class="data-value">${outputs.concurrentAPI.toFixed(2)} / sec</p>
                </div>
                <div class="data-card">
                    <p class="data-label">Eff. Throughput / Exec Node</p>
                    <p class="data-value">${outputs.effectiveExecNodeThroughput.toFixed(2)} / sec</p>
                </div>
                <div class="data-card">
                    <p class="data-label">Raw Exec Nodes Required</p>
                    <p class="data-value">${outputs.execNodes.toFixed(2)}</p>
                </div>
            </div>
            ${detailedViewHtml}
            <div class="result-grid primary-results">
                <div class="data-card primary-result">
                    <p class="data-label">Exec Nodes (Non-HA)</p>
                    <p class="data-value primary">${outputs.nonHaExecNodes}</p>
                </div>
                <div class="data-card primary-result">
                    <p class="data-label">Exec Nodes (HA)</p>
                    <p class="data-value primary">${outputs.haExecNodes}</p>
                </div>
                <div class="data-card primary-result">
                    <p class="data-label">FeedMaster (Non-HA)</p>
                    <p class="data-value primary">${outputs.nonHaFmNodes}</p>
                </div>
                <div class="data-card primary-result">
                    <p class="data-label">FeedMaster (HA)</p>
                    <p class="data-value primary">${outputs.haFmNodes}</p>
                </div>
            </div>
        </div>`;

    document.getElementById('result-ultra').innerHTML = resultHTML;
}

function getScheduledCalculationResults() {
     const config = configurationOptions;
    const batchSizeInput = parseFloat(document.getElementById('batch-size').value) || 0;
    const processTime = parseFloat(document.getElementById('process-time').value) || 12;
    const complexityMultiplier = parseFloat(document.getElementById('complexity-multiplier').value) || 1.5;
    const isRows = document.getElementById('toggle-switch-scheduled').checked;

    let batchSizeGb = batchSizeInput;
    if (isRows) {
        batchSizeGb = batchSizeInput / config.scheduled.rowsToGbDivisor;
    }

    const mbPerMinute = processTime > 0 ? (batchSizeGb * 1024) / (processTime * 60) : 0;
    const nodesRequired = mbPerMinute > 0 ? (mbPerMinute * complexityMultiplier) / config.scheduled.mbPerMinutePerNode : 0;
    const nonHaNodesRequired = Math.ceil(nodesRequired);
    const haNodesRequired = Math.ceil(Math.max(nodesRequired * config.ha.bufferMultiplier, config.ha.minNodes));

    const maxCapacity = (haNodesRequired * config.scheduled.mbPerMinutePerNode) / complexityMultiplier;
    const capacityHeadroom = mbPerMinute > 0 ? ((maxCapacity / mbPerMinute) - 1) * 100 : 0;

    return {
        inputs: { batchSizeInput, unit: isRows ? 'Rows' : 'GB', processTime, complexityMultiplier },
        outputs: {
            mbPerMinute, nodesRequired, nonHaNodesRequired, haNodesRequired, maxCapacity, capacityHeadroom
        }
    };
}

function calculateScheduled() {
    // Mark calculation as performed
    calculationState.scheduled = true;

    const { outputs } = getScheduledCalculationResults();

    const details = [
        { label: 'Required Throughput', value: `${outputs.mbPerMinute.toFixed(2)} MB/min` },
        { label: 'Raw Nodes Required', value: outputs.nodesRequired.toFixed(2) }
    ];

     const results = [
         { label: 'Nodes Required (Non-HA)', value: outputs.nonHaNodesRequired },
         { label: 'Nodes Required (HA)', value: outputs.haNodesRequired }
    ];

    const detailsExtra = {
        raw: { label: 'Max Throughput', value: `${outputs.maxCapacity.toFixed(2)} MB/min` },
        peak: { label: 'Capacity Headroom', value: outputs.capacityHeadroom.toFixed(1) },
        avg: null
    };

    document.getElementById('result-scheduled').innerHTML = generateResultCard(
        'Scheduled Task Sizing',
        results,
        details,
        detailsExtra
    );
}

function getHeadlessCalculationResults() {
    const config = configurationOptions;
    const isMicrobatching = document.getElementById('toggle-switch-headless').checked;

    let inputs = {};
    let outputs = {};

    if (isMicrobatching) {
        const events = parseFloat(document.getElementById('events-headless').value) || 0;
        const unit = currentUnits.headless;
        const coverageDaysForUnit = (unit === 'perMonth') ? 30.42 : (unit === 'perYear' ? 365 : 1);
        const coverageHours = parseFloat(document.getElementById('coverage-hours-headless-on').value) || 24;
        const peak = parseFloat(document.getElementById('peak-headless-on').value) || 100;

        inputs = { sizingMethod: 'Event Frequency', events, unit, coverageHours, peak };

        const avgEventsPerSecond = getAverageRequestsPerSecond(events, unit, coverageDaysForUnit, coverageHours);
        const concurrentEvents = avgEventsPerSecond * (peak / 100);
        const assumedResponseTime = config.headless.assumedResponseTime;
        const effectiveNodeThroughput = assumedResponseTime > 0 ? (config.headless.requestsPerNodePerSecond / assumedResponseTime) : 0;

        const nodesRequired = effectiveNodeThroughput > 0 ? concurrentEvents / effectiveNodeThroughput : Infinity;
        const nonHaNodesRequired = Math.ceil(nodesRequired);
        const haNodesRequired = Math.ceil(Math.max(nodesRequired * config.ha.bufferMultiplier, config.ha.minNodes));

        const maxCapacity = haNodesRequired * effectiveNodeThroughput;
        const capacityHeadroomPeak = concurrentEvents > 0 ? ((maxCapacity / concurrentEvents) - 1) * 100 : 0;
        const capacityHeadroomAvg = avgEventsPerSecond > 0 ? ((maxCapacity / avgEventsPerSecond) - 1) * 100 : 0;

        outputs = {
            avgEventsPerSecond, concurrentEvents, effectiveNodeThroughput, nodesRequired, nonHaNodesRequired, haNodesRequired,
            maxCapacity, capacityHeadroomPeak, capacityHeadroomAvg
        };

    } else { // Data Volume Method
        const eventsPerDay = parseFloat(document.getElementById('events-headless-off').value) || 0;
        const messageSize = parseFloat(document.getElementById('event-size-headless').value) || 2000;
        const coverageHours = parseFloat(document.getElementById('coverage-hours-headless-off').value) || 24;
        const peak = parseFloat(document.getElementById('peak-headless-off').value) || 100;
        const complexity = parseFloat(document.getElementById('complexity-headless').value) || 1;

        inputs = { sizingMethod: 'Data Volume', eventsPerDay, messageSize, coverageHours, peak, complexity };

        const batchSizeGbEq = (messageSize * eventsPerDay) / config.headless.bytesToGbEqDivisor;
        const avgMbPerMinute = coverageHours > 0 ? (batchSizeGbEq * 1024) / (coverageHours * 60) : 0;
        const peakMbPerMinute = avgMbPerMinute * (peak / 100);

        const nodesRequired = peakMbPerMinute > 0 ? (peakMbPerMinute * complexity) / config.headless.mbPerMinutePerNode : 0;
        const nonHaNodesRequired = Math.ceil(nodesRequired);
        const haNodesRequired = Math.ceil(Math.max(nodesRequired * config.ha.bufferMultiplier, config.ha.minNodes));

        const maxCapacity = (haNodesRequired * config.headless.mbPerMinutePerNode) / complexity;
        const capacityHeadroomPeak = peakMbPerMinute > 0 ? ((maxCapacity / peakMbPerMinute) - 1) * 100 : 0;
        const capacityHeadroomAvg = avgMbPerMinute > 0 ? ((maxCapacity / avgMbPerMinute) - 1) * 100 : 0;

        outputs = {
            avgMbPerMinute, peakMbPerMinute, nodesRequired, nonHaNodesRequired, haNodesRequired, maxCapacity,
            capacityHeadroomPeak, capacityHeadroomAvg
        }
    }
    return { inputs, outputs };
}

function calculateHeadlessUltra() {
    // Mark calculation as performed
    calculationState.headless = true;

    const { outputs } = getHeadlessCalculationResults();
    const isMicrobatching = document.getElementById('toggle-switch-headless').checked;

    if (isMicrobatching) {
         const details = [
            { label: 'Avg. Concurrent Events', value: `${outputs.avgEventsPerSecond.toFixed(2)} / sec` },
            { label: 'Peak Concurrent Events', value: `${outputs.concurrentEvents.toFixed(2)} / sec` },
            { label: 'Effective Throughput / Node', value: `${outputs.effectiveNodeThroughput.toFixed(2)} / sec`},
        ];
        const results = [
             { label: 'Exec Nodes (Non-HA)', value: outputs.nonHaNodesRequired },
             { label: 'Exec Nodes (HA)', value: outputs.haNodesRequired }
        ];
        const detailsExtra = {
            raw: { label: 'Max Concurrent Events', value: `${outputs.maxCapacity.toFixed(2)} / sec` },
            peak: { label: 'Headroom vs. Peak', value: outputs.capacityHeadroomPeak.toFixed(1) },
            avg: { label: 'Headroom vs. Average', value: outputs.capacityHeadroomAvg.toFixed(1) }
        };
        document.getElementById('result-headless').innerHTML = generateResultCard(
            'Headless Ultra Sizing (Event Freq.)',
            results,
            details,
            detailsExtra
        );
    } else {
        const details = [
            { label: 'Avg. Throughput', value: `${outputs.avgMbPerMinute.toFixed(2)} MB/min` },
            { label: 'Peak Throughput', value: `${outputs.peakMbPerMinute.toFixed(2)} MB/min` }
        ];
        const results = [
             { label: 'Exec Nodes (Non-HA)', value: outputs.nonHaNodesRequired },
             { label: 'Exec Nodes (HA)', value: outputs.haNodesRequired }
        ];
        const detailsExtra = {
            raw: { label: 'Max Throughput', value: `${outputs.maxCapacity.toFixed(2)} MB/min` },
            peak: { label: 'Headroom vs. Peak', value: outputs.capacityHeadroomPeak.toFixed(1) },
            avg: { label: 'Headroom vs. Average', value: outputs.capacityHeadroomAvg.toFixed(1) }
        };
        document.getElementById('result-headless').innerHTML = generateResultCard(
            'Headless Ultra Sizing (Data Volume)',
            results,
            details,
            detailsExtra
        );
    }
}

// --- Export & Modal Logic ---
function exportData(tabName) {
    let data;
    const explanation = { ...EXPORT_EXPLANATIONS }; // Create a copy

    if (tabName === 'triggered') {
        const { inputs, outputs } = getTriggeredCalculationResults();
        data = {
            calculationType: 'Triggered Task',
            explanation: { ...explanation, fieldGlossary: explanation.glossary.triggered },
            inputs: {
                apiRequests: { value: inputs.requests, unit: inputs.unit },
                coverageDays: { value: inputs.coverageDays },
                coverageHours: { value: inputs.coverageHours },
                peakLoadPercentage: { value: inputs.peak },
                complexity: { value: inputs.complexity }
            },
            outputs: {
                assumedResponseTime: { value: inputs.assumedResponseTime },
                avgRequestsPerSecond: { value: outputs.avgRequestsPerSecond.toFixed(4) },
                peakRequestsPerSecond: { value: outputs.concurrentAPI.toFixed(4) },
                effectiveThroughputPerNode: { value: outputs.effectiveNodeThroughput.toFixed(2) },
                rawNodesRequired: { value: outputs.nodesRequired.toFixed(4) },
                nodesRequiredNonHA: { value: outputs.nonHaNodesRequired },
                nodesRequiredHA: { value: outputs.haNodesRequired },
                maxCapacityHA: { value: outputs.maxCapacity.toFixed(2) },
                headroomVsPeak: { value: `${outputs.capacityHeadroomPeak.toFixed(1)}%` },
                headroomVsAverage: { value: `${outputs.capacityHeadroomAvg.toFixed(1)}%` }
            }
        };
    } else if (tabName === 'ultra') {
        const { inputs, outputs } = getUltraCalculationResults();
         data = {
            calculationType: 'Ultra Task',
            explanation: { ...explanation, fieldGlossary: explanation.glossary.ultra },
            inputs: {
                apiRequests: { value: inputs.requests, unit: inputs.unit },
                coverageDays: { value: inputs.coverageDays },
                coverageHours: { value: inputs.coverageHours },
                peakLoadPercentage: { value: inputs.peak },
                complexity: { value: inputs.complexity }
            },
            outputs: {
                assumedResponseTime: { value: inputs.assumedResponseTime },
                avgRequestsPerSecond: { value: outputs.avgRequestsPerSecond.toFixed(4) },
                peakRequestsPerSecond: { value: outputs.concurrentAPI.toFixed(4) },
                effectiveThroughputPerExecNode: { value: outputs.effectiveExecNodeThroughput.toFixed(2) },
                execNodesNonHA: { value: outputs.nonHaExecNodes },
                execNodesHA: { value: outputs.haExecNodes },
                fmNodesNonHA: { value: outputs.nonHaFmNodes },
                fmNodesHA: { value: outputs.haFmNodes },
                maxCapacityHA: { value: outputs.maxCapacity.toFixed(2) },
                headroomVsPeak: { value: `${outputs.capacityHeadroomPeak.toFixed(1)}%` },
                headroomVsAverage: { value: `${outputs.capacityHeadroomAvg.toFixed(1)}%` }
            }
        };
    } else if (tabName === 'scheduled') {
        const { inputs, outputs } = getScheduledCalculationResults();
        data = {
            calculationType: 'Scheduled Task',
            explanation: { ...explanation, fieldGlossary: explanation.glossary.scheduled },
            inputs: {
                batchSize: { value: inputs.batchSizeInput, unit: inputs.unit },
                processWindowHours: { value: inputs.processTime },
                complexityMultiplier: { value: inputs.complexityMultiplier }
            },
            outputs: {
                requiredThroughput: { value: `${outputs.mbPerMinute.toFixed(2)} MB/min` },
                rawNodesRequired: { value: outputs.nodesRequired.toFixed(4) },
                nodesRequiredNonHA: { value: outputs.nonHaNodesRequired },
                nodesRequiredHA: { value: outputs.haNodesRequired },
                maxCapacityHA: { value: `${outputs.maxCapacity.toFixed(2)} MB/min` },
                headroom: { value: `${outputs.capacityHeadroom.toFixed(1)}%` }
            }
        }
    } else if (tabName === 'headless') {
         const { inputs, outputs } = getHeadlessCalculationResults();
         if(inputs.sizingMethod === 'Event Frequency'){
            data = {
                calculationType: 'Headless Ultra (Event Frequency)',
                explanation: { ...explanation, fieldGlossary: explanation.glossary.headless.eventFrequency },
                inputs: {
                    eventVolume: { value: inputs.events, unit: inputs.unit },
                    coverageHours: { value: inputs.coverageHours },
                    peakLoadPercentage: { value: inputs.peak }
                },
                outputs: {
                   avgEventsPerSecond: { value: outputs.avgEventsPerSecond.toFixed(4) },
                   peakEventsPerSecond: { value: outputs.concurrentEvents.toFixed(4) },
                   effectiveThroughputPerNode: { value: outputs.effectiveNodeThroughput.toFixed(2) },
                   execNodesNonHA: { value: outputs.nonHaNodesRequired },
                   execNodesHA: { value: outputs.haNodesRequired },
                   maxCapacityHA: { value: `${outputs.maxCapacity.toFixed(2)} events/sec` },
                   headroomVsPeak: { value: `${outputs.capacityHeadroomPeak.toFixed(1)}%` },
                   headroomVsAverage: { value: `${outputs.capacityHeadroomAvg.toFixed(1)}%` }
                }
            };
         } else { // Data Volume
            data = {
                calculationType: 'Headless Ultra (Data Volume)',
                explanation: { ...explanation, fieldGlossary: explanation.glossary.headless.dataVolume },
                inputs: {
                   eventVolumePerDay: { value: inputs.eventsPerDay },
                   avgMessageSizeBytes: { value: inputs.messageSize },
                   coverageHours: { value: inputs.coverageHours },
                   peakLoadPercentage: { value: inputs.peak },
                   complexityMultiplier: { value: inputs.complexity }
                },
                outputs: {
                   avgThroughput: { value: `${outputs.avgMbPerMinute.toFixed(2)} MB/min` },
                   peakThroughput: { value: `${outputs.peakMbPerMinute.toFixed(2)} MB/min` },
                   execNodesNonHA: { value: outputs.nonHaNodesRequired },
                   execNodesHA: { value: outputs.haNodesRequired },
                   maxCapacityHA: { value: `${outputs.maxCapacity.toFixed(2)} MB/min` },
                   headroomVsPeak: { value: `${outputs.capacityHeadroomPeak.toFixed(1)}%` },
                   headroomVsAverage: { value: `${outputs.capacityHeadroomAvg.toFixed(1)}%` }
                }
            };
         }
    }
    delete data.explanation.glossary; // Clean up the glossary from the root explanation object

    const jsonString = JSON.stringify(data, null, 2);
    document.getElementById('export-json').textContent = jsonString;
    document.getElementById('export-modal').classList.remove('hidden');
    document.getElementById('export-modal').classList.add('flex');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
    document.getElementById('export-modal').classList.remove('flex');
}

function copyJsonToClipboard() {
    const jsonText = document.getElementById('export-json').textContent;
    navigator.clipboard.writeText(jsonText).then(() => {
        const copyButton = document.getElementById('copy-button');
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = 'Copy to Clipboard';
        }, 2000);
    });
}

// --- Throughput Prediction Functions ---
function updatePredictionForm() {
    const taskType = document.getElementById('prediction-task-type').value;
    const ultraInputs = document.getElementById('prediction-ultra-inputs');
    const standardInputs = document.getElementById('prediction-standard-inputs');
    const headlessMode = document.getElementById('prediction-headless-mode-container');

    ultraInputs.classList.add('hidden');
    standardInputs.classList.add('hidden');
    headlessMode.classList.add('hidden');

    if (taskType === 'ultra') {
        ultraInputs.classList.remove('hidden');
    } else if (taskType === 'headless') {
        headlessMode.classList.remove('hidden');
        standardInputs.classList.remove('hidden');
    } else {
        standardInputs.classList.remove('hidden');
    }
}

function calculatePrediction() {
    // Mark calculation as performed
    calculationState.prediction = true;

    const taskType = document.getElementById('prediction-task-type').value;
    const config = configurationOptions;
    let title = '';
    let headers = [];
    let dataRows = [];

    if (taskType === 'triggered') {
        const nodeCount = parseFloat(document.getElementById('prediction-node-count').value) || 0;
        title = `Triggered Task Throughput for ${nodeCount} Nodes`;
        headers = ['Complexity', 'Avg. Response Time', 'Est. Throughput (req/sec)'];
        Object.entries(config.triggered.complexityResponseTimes).forEach(([level, time]) => {
            const throughput = (nodeCount * (config.triggered.requestsPerNodePerSecond / time)).toFixed(2);
            const levelName = level.charAt(0).toUpperCase() + level.slice(1);
            dataRows.push([levelName, `${time}s`, throughput]);
        });
    } else if (taskType === 'ultra') {
        const execNodes = parseFloat(document.getElementById('prediction-exec-nodes').value) || 0;
        title = `Ultra Task Throughput for ${execNodes} Execution Nodes`;
        headers = ['Complexity', 'Avg. Response Time', 'Est. Throughput (req/sec)'];
        Object.entries(config.ultra.complexityResponseTimes).forEach(([level, time]) => {
            const throughput = (execNodes * (config.ultra.exec.requestsPerNodePerSecond / time)).toFixed(2);
            const levelName = level.charAt(0).toUpperCase() + level.slice(1);
            dataRows.push([levelName, `${time}s`, throughput]);
        });
    } else if (taskType === 'scheduled') {
        const nodeCount = parseFloat(document.getElementById('prediction-node-count').value) || 0;
        title = `Scheduled Task Throughput for ${nodeCount} Nodes`;
        headers = ['Complexity', 'Multiplier', 'Est. Throughput (MB/min)', 'Est. Throughput (Rows/min)'];
        Object.entries(config.scheduled.complexityMultipliers).forEach(([level, multiplier]) => {
            const throughputMB = ((nodeCount * config.scheduled.mbPerMinutePerNode) / multiplier).toFixed(2);
            const throughputRows = ((throughputMB * 1000 * config.scheduled.rowsToGbDivisor) / 1000).toFixed(0); // Convert MB to GB, then to rows
            const levelName = level.charAt(0).toUpperCase() + level.slice(1);
            dataRows.push([levelName, `${multiplier}x`, throughputMB, parseInt(throughputRows).toLocaleString()]);
        });
    } else if (taskType === 'headless') {
         const nodeCount = parseFloat(document.getElementById('prediction-node-count').value) || 0;
         const headlessMode = document.getElementById('prediction-headless-mode').value;
         if (headlessMode === 'eventFrequency') {
            title = `Headless (Event Freq.) Throughput for ${nodeCount} Nodes`;
            headers = ['Complexity', 'Avg. Response Time', 'Est. Throughput (events/sec)'];
             const time = config.headless.assumedResponseTime;
             const throughput = (nodeCount * (config.headless.requestsPerNodePerSecond / time)).toFixed(2);
             dataRows.push(['N/A', `${time}s`, throughput]);
         } else { // Data Volume
            title = `Headless (Data Volume) Throughput for ${nodeCount} Nodes`;
            headers = ['Complexity', 'Multiplier', 'Est. Throughput (MB/min)'];
            Object.entries(config.headless.complexityMultipliers).forEach(([level, multiplier]) => {
                const throughput = ((nodeCount * config.headless.mbPerMinutePerNode) / multiplier).toFixed(2);
                const levelName = level.charAt(0).toUpperCase() + level.slice(1);
                dataRows.push([levelName, `${multiplier}x`, throughput]);
            });
         }
    }

    document.getElementById('result-prediction').innerHTML = generatePredictionResultCard(title, headers, dataRows);
}

// Initial setup on page load
function addAutoCalculationListeners() {
    // Map of input IDs to their calculator type
    const inputMap = {
        // Triggered task inputs
        'api-requests-triggered': 'triggered',
        'coverage-days-triggered': 'triggered',
        'coverage-hours-triggered': 'triggered',
        'peak-triggered': 'triggered',
        'complexity-triggered': 'triggered',

        // Ultra task inputs
        'api-requests-ultra': 'ultra',
        'coverage-days-ultra': 'ultra',
        'coverage-hours-ultra': 'ultra',
        'peak-ultra': 'ultra',
        'complexity-ultra': 'ultra',

        // Scheduled task inputs
        'batch-size': 'scheduled',
        'process-time': 'scheduled',
        'complexity-multiplier': 'scheduled',

        // Headless task inputs
        'events-headless': 'headless',
        'events-headless-off': 'headless',
        'event-size-headless': 'headless',
        'coverage-hours-headless-on': 'headless',
        'coverage-hours-headless-off': 'headless',
        'peak-headless-on': 'headless',
        'peak-headless-off': 'headless',
        'complexity-headless': 'headless',

        // Prediction inputs
        'prediction-task-type': 'prediction',
        'prediction-node-count': 'prediction',
        'prediction-exec-nodes': 'prediction',
        'prediction-fm-nodes': 'prediction',
        'prediction-headless-mode': 'prediction'
    };

    // Add listeners to all inputs
    Object.keys(inputMap).forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            const calculatorType = inputMap[inputId];

            // Add debounced listener to avoid too many recalculations
            let timeoutId;
            const debouncedRecalc = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (calculationState[calculatorType]) {
                        triggerCalculation(calculatorType);
                    }
                }, 500); // 500ms delay
            };

            if (element.type === 'select-one') {
                element.addEventListener('change', debouncedRecalc);
            } else {
                element.addEventListener('input', debouncedRecalc);
            }
        }
    });

    // Add listener for headless toggle switches
    const headlessToggle = document.getElementById('toggle-switch-headless');
    if (headlessToggle) {
        headlessToggle.addEventListener('change', () => {
            if (calculationState.headless) {
                setTimeout(() => triggerCalculation('headless'), 100);
            }
        });
    }

    const scheduledToggle = document.getElementById('toggle-switch-scheduled');
    if (scheduledToggle) {
        scheduledToggle.addEventListener('change', () => {
            if (calculationState.scheduled) {
                setTimeout(() => triggerCalculation('scheduled'), 100);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updatePredictionForm();

    // Clear all result containers initially
    document.getElementById('result-triggered').innerHTML = '<p class="section-text" style="text-align: center; color: #64748b; font-style: italic;">Click "Calculate" to see results</p>';
    document.getElementById('result-ultra').innerHTML = '<p class="section-text" style="text-align: center; color: #64748b; font-style: italic;">Click "Calculate" to see results</p>';
    document.getElementById('result-scheduled').innerHTML = '<p class="section-text" style="text-align: center; color: #64748b; font-style: italic;">Click "Calculate" to see results</p>';
    document.getElementById('result-headless').innerHTML = '<p class="section-text" style="text-align: center; color: #64748b; font-style: italic;">Click "Calculate" to see results</p>';
    document.getElementById('result-prediction').innerHTML = '<p class="section-text" style="text-align: center; color: #64748b; font-style: italic;">Select workload type and click "Calculate" to see throughput predictions</p>';

    // Add auto-calculation listeners for input changes
    addAutoCalculationListeners();

    // Close modal when clicking outside of it
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeExportModal();
            }
        });
    }
});