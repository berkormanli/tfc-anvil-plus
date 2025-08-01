/**
 * TerraFirmaCraft Anvil Helper - Main JavaScript Module
 * 
 * This file handles the core functionality of the anvil helper application,
 * including slider management, step calculations, image processing, and recipe management.
 */

// Global variable to store tooltip text content
var tooltipText = "";

// Get the tooltip element from DOM for displaying hover information
const [tooltip] = document.getElementsByClassName('tooltip');

// Initialize GUI scale to default value (2x) if not already set
// This controls the overall size of the interface elements
if (!document.documentElement.style.getPropertyValue('--gui-scale')) {
    document.documentElement.style.setProperty('--gui-scale', '4');
}

/**
 * Central error handling utility
 * Provides consistent error display and styling across the application
 */
const utils = {
    displayError: function(msg, element) {
        // Remove any existing error tooltips for this element
        const existingTooltips = document.body.querySelectorAll('.error-tooltip');
        existingTooltips.forEach(tooltip => {
            if (tooltip.dataset.elementId === element.id || tooltip.dataset.elementClass === element.className) {
                tooltip.remove();
            }
        });
        
        // Create new error tooltip
        const errorTooltip = document.createElement('div');
        errorTooltip.className = 'error-tooltip';
        errorTooltip.textContent = msg;
        errorTooltip.dataset.elementId = element.id || '';
        errorTooltip.dataset.elementClass = element.className || '';
        
        // Position the tooltip under the offending control
        const rect = element.getBoundingClientRect();
        errorTooltip.style.position = 'fixed';
        errorTooltip.style.top = (rect.bottom + 5) + 'px';
        errorTooltip.style.left = Math.max(10, rect.left) + 'px';
        errorTooltip.style.maxWidth = 'calc(100vw - 20px)';
        errorTooltip.style.zIndex = '1000';
        
        // Add to document body
        document.body.appendChild(errorTooltip);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (errorTooltip.parentNode) {
                errorTooltip.remove();
            }
        }, 3000);
        
        // Add red border to the offending element
        const originalBorder = element.style.borderColor;
        element.style.borderColor = 'red';
        setTimeout(() => {
            element.style.borderColor = originalBorder;
        }, 3000);
    }
};

/**
 * Step value mappings for TerraFirmaCraft anvil actions
 * Each action moves the slider by a specific amount:
 * - Negative values move left (red actions)
 * - Positive values move right (green actions)
 */
const stepMap = {
    'draw': -15,       // Most powerful left movement
    'hard-hit': -9,    // Strong left movement
    'medium-hit': -6,  // Medium left movement  
    'light-hit': -3,   // Light left movement
    'punch': 2,        // Light right movement
    'bend': 7,         // Medium right movement
    'upset': 13,       // Strong right movement
    'shrink': 16,      // Most powerful right movement
}

/**
 * Human-readable names for display purposes
 * Maps internal step names to proper display names
 */
nameMap = {
    'draw': 'Draw',
    'hard-hit': 'Hard Hit',
    'medium-hit': 'Medium Hit',
    'light-hit': 'Light Hit',
    'hit': 'Hit',             // Generic hit (value 0)
    'punch': 'Punch',
    'bend': 'Bend',
    'upset': 'Upset',
    'shrink': 'Shrink'
}

// Create reverse mapping from step values to step names
const stepNames = Object.keys(stepMap);
const valuesToStep = {};
valuesToStep[0] = 'hit'; // Special case: 0 value maps to generic 'hit'
stepNames.forEach(name => valuesToStep[stepMap[name]] = name);

/**
 * Convert a numeric step value back to its step name
 * @param {number} v - The step value to convert
 * @returns {string} The corresponding step name
 */
function valueToStep(v) {
    return valuesToStep[v];
}

/**
 * Application state variables
 * These track the current state of the forging process
 */
let steps = [];           // History of performed steps
let expected = [];        // Expected/required step rules
let nextSteps = [];       // Calculated optimal next steps
let onValidSolution = false; // Whether current steps satisfy all rules

// DOM references to the main slider elements
const greenSlider = document.querySelector('.green.slider');
const redSlider = document.querySelector('.red.slider');

// Enhanced click-based rule selection system
// No text input needed - users click to select actions and positions

// Initialize DOM-dependent code after page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize recipe management after DOM is ready
    initializeRecipeManagement();
    
    // Initialize number input validation
    initializeNumberInputs();
    
    // Initialize step list
    initializeStepList();
});

// Cache number inputs for bidirectional sync (will be populated after DOM loads)
let numberInputs = [];

// Guard flag to prevent infinite loops during sync
let syncInProgress = false;

const dragging = {
    element: undefined,
    initialY: undefined,
    initialX: undefined,
};

let lastShiftState = false;

const stepsEl = document.querySelectorAll('.real.steps > *');
const performedEls = [...stepsEl].map(e => e.getElementsByClassName('performed')[0]);
const expectedEls = [...stepsEl].map(e => e.getElementsByClassName('expected')[0]);
const indicatorsEl = [...stepsEl].map(e => e.getElementsByClassName('indicators')[0]);
const hintsStepsEl = document.querySelectorAll('.hints.steps > *');
const performHintsEls = [...hintsStepsEl].map(e => e.getElementsByClassName('performed')[0]);
let lastMouseX, lastMouseY;

function getGuiScale() {
    return window.getComputedStyle(document.body).getPropertyValue('--gui-scale');
}

function screenToInvCoords(el, x, y, scale = undefined) {
    const box = el.getBoundingClientRect();
    scale = scale || getGuiScale();
    const invx = box.left / scale + Math.floor((x - box.left) / scale) + 4;
    const invy = box.top / scale + Math.floor((y - box.top) / scale) + 4;
    return [invx, invy];
}

function refreshTooltip(el) {
    const scale = getGuiScale();
    const [x, y] = screenToInvCoords(el, lastMouseX, lastMouseY, scale);
    const tooltipText = el.dataset ? el.dataset.tooltip || "" : "";
    const visibility = tooltipText ? 'visible' : 'hidden';

    const hoverStyle = window.getComputedStyle(el);
    const offsetXS = hoverStyle.getPropertyValue('--tooltip-offset-x') || "0";
    const offsetYS = hoverStyle.getPropertyValue('--tooltip-offset-y') || "0";
    const offsetX = parseInt(offsetXS);
    const offsetY = parseInt(offsetYS);

    const span = tooltip.getElementsByClassName('tooltip-text')[0];
    span.textContent = tooltipText;
    const spanBox = span.getBoundingClientRect();
    const targetHeight = Math.floor(spanBox.height / scale);
    const targetWidth = Math.floor(spanBox.width / scale);
    tooltip.style.setProperty('--tooltip-width', targetWidth);
    tooltip.style.setProperty('--tooltip-height', targetHeight);
    tooltip.style.setProperty('--tooltip-x', x);
    tooltip.style.setProperty('--tooltip-y', y);
    tooltip.style.setProperty('--tooltip-offset-x', offsetX);
    tooltip.style.setProperty('--tooltip-offset-y', offsetY);
    tooltip.style.setProperty('visibility', visibility);
}

document.addEventListener('mousemove', ev => {
    lastMouseX = ev.x;
    lastMouseY = ev.y;

    tooltip.classList = ['tooltip'];

    if (!ev.target) return;

    refreshTooltip(ev.target);
});

const allActions = document.querySelectorAll('.all-actions [data-tooltip]');
allActions.forEach(el => el.addEventListener('click', ev => {
    let greenProgress = getProgress(greenSlider);

    const el = ev.target;
    const classes = [...el.classList];
    classes.forEach(stepName => {
        const step = stepMap[stepName] || 0;
        if (step) {
            greenProgress += step;
            steps.push(stepName);
            refreshExpected();

            if (!nextSteps || nextSteps.length == 0) {
                refreshHints(greenProgress);
            } else {
                const hint = nextSteps.pop();
                if (hint !== stepName) {
                    refreshHints(greenProgress);
                } else {
                    refreshNextHints();
                }
            }
        }
    });

    if (greenProgress < 0 || greenProgress > 150) {
        steps = [];
        greenProgress = 0;
    }

    updateProgress(greenSlider, greenProgress);
    updateSteps();
}));

function updateProgress(slider, progress, showTooltip) {
    slider.style.setProperty('--slider-progress', progress);
    if (showTooltip !== undefined) {
        if (showTooltip) {
            slider.dataset.tooltip = progress;
        } else {
            slider.dataset.tooltip = "";
        }
    }
    
    // Update paired number input if it exists (avoid infinite loop with guard flag)
    if (!syncInProgress && numberInputs.length > 0) {
        syncInProgress = true;
        const index = slider.classList.contains('green') ? 0 : 1;
        if (numberInputs[index] && numberInputs[index].value !== progress.toString()) {
            numberInputs[index].value = progress;
            // Clear any validation styling
            numberInputs[index].style.borderColor = '';
        }
        syncInProgress = false;
    }
}

function getProgress(slider) {
    const progress = +window.getComputedStyle(slider).getPropertyValue('--slider-progress');
    return progress;
}

document.querySelectorAll('.slider').forEach(el => {
    el.addEventListener('mousedown', ev => {
        dragging.element = ev.target;
        dragging.initialX = ev.X;
        dragging.initialY = ev.y;
    })
});

document.addEventListener('mousemove', ev => {
    if (!dragging.element) return;
    const el = dragging.element;
    const scale = getGuiScale();
    const [x, y] = screenToInvCoords(el, ev.x, ev.y, scale);

    const classes = [...el.classList];
    if (classes.includes('slider')) {
        const offX = 3;
        const bar = document.querySelector('.bar');
        const barBox = bar.getBoundingClientRect();
        const [barX, barY] = screenToInvCoords(bar, barBox.x, barBox.y, scale);
        const oldProgress = getProgress(el);
        const newProgress = Math.min(150, Math.max(0, x - barX - offX));
        updateProgress(el, newProgress, true);
        refreshTooltip(ev.target);

        if (oldProgress !== newProgress) {
            refreshHints();
        }
    }
});

document.addEventListener('mouseup', ev => {
    if (!dragging.element) return;

    if (!ev.shiftKey) {
        showProgressAll(false);
    }
    dragging.element = undefined;
});

function showProgressAll(show) {
    document.querySelectorAll('.slider').forEach(el => {
        updateProgress(el, getProgress(el), show);
    });
    const el = document.elementFromPoint(lastMouseX, lastMouseY);
    if (el) {
        refreshTooltip(el);
    }
}

document.addEventListener('keydown', ev => {
    if (lastShiftState != ev.shiftKey) {
        showProgressAll(ev.shiftKey);
    }

    lastShiftState = ev.shiftKey;
});

document.addEventListener('keyup', ev => {
    if (lastShiftState !== ev.shiftKey) {
        showProgressAll(ev.shiftKey);
    }

    lastShiftState = ev.shiftKey;
});

/**
 * Enhanced step selection system
 * First click selects action type, subsequent clicks cycle through position options
 */
stepsEl.forEach((el, i) => {
    function clickStep(el, i) {
        // Rule selection only includes generic hit types, no specific hit variants
        const actionCycle = ['hit', 'draw', 'punch', 'bend', 'upset', 'shrink'];
        
        if (expected[i] === undefined) {
            // First click: start with 'hit' and default position
            expected[i] = {
                name: actionCycle[0],
                last_idx: i // Default to position based on slot (0=Last, 1=Second Last, 2=Third Last)
            };
        } else {
            // Subsequent clicks: cycle through action types
            const nameidx = actionCycle.indexOf(expected[i].name);
            expected[i].name = actionCycle[(nameidx + 1) % actionCycle.length];
        }
        refreshExpected();
        refreshHints();
        refreshTooltip(el);
    }
    
    function clickIndicators(el, i) {
        const exp = expected[i];
        if (exp === undefined) {
            // If no action selected yet, start with default hit action
            expected[i] = {
                name: 'hit',
                last_idx: i
            };
        } else {
            // Cycle through position options: Last -> Second Last -> Third Last -> Not Last -> Any -> back to Last
            if (exp.last_idx !== undefined) {
                // Currently set to a specific position, cycle to next position or special states
                if (exp.last_idx === 0) { // Last -> Second Last
                    exp.last_idx = 1;
                } else if (exp.last_idx === 1) { // Second Last -> Third Last
                    exp.last_idx = 2;
                } else if (exp.last_idx === 2) { // Third Last -> Not Last
                    delete exp.last_idx;
                    exp.notlast = true;
                } else {
                    // Fallback to Last
                    exp.last_idx = 0;
                }
            } else if (exp.notlast !== undefined) {
                // Not Last -> Any
                delete exp.notlast;
                exp.any = true;
            } else if (exp.any !== undefined) {
                // Any -> back to Last
                delete exp.any;
                exp.last_idx = 0;
            } else {
                // Fallback: set to Last
                exp.last_idx = 0;
            }
        }
        refreshExpected();
        refreshHints();
    }

    const expectedEl = el.getElementsByClassName('expected')[0];
    const indicatorsEl = el.getElementsByClassName('indicators')[0];
    expectedEl.addEventListener('click', clickStep.bind(null, expectedEl, i));
    indicatorsEl.addEventListener('click', clickIndicators.bind(null, indicatorsEl, i));
});

function updateSteps() {
    const stepsFromEnd = steps.slice(-3).reverse();
    performedEls.forEach(el => el.replaceChildren([]));
    stepsFromEnd.forEach((s, i) => {
        const performedEl = performedEls[i];
        const newChild = document.createElement('div');
        newChild.classList = 'bg ' + s;
        performedEl.appendChild(newChild);
    });
    refreshStepList(); // Update step list whenever steps change
}

function refreshNextHints() {
    const toDisplay = (nextSteps || []).slice(-3).reverse();
    performHintsEls.forEach(el => el.replaceChildren([]));
    performHintsEls.forEach((el, i) => {
        const nextStep = toDisplay[i];
        if (nextStep) {
            const newChild = document.createElement('div');
            newChild.classList = 'bg ' + nextStep;
            el.appendChild(newChild);
            el.classList = 'performed';
        } else {
            el.classList = 'performed hidden';
        }
    })
}

function expectationForStep(i, counted) {
    let valid = true;
    const exp = expected[i];
    if (!exp) return false;

    let hitWhen;
    let name = nameMap[exp.name];
    let indicators = [false, false, false];
    if (exp.any) {
        hitWhen = 'Any';
        indicators = [true, true, true];
    } else if (exp.notlast) {
        hitWhen = 'Not Last';
        indicators = [false, true, true];
    } else {
        hitWhen = ['Last', 'Second Last', 'Third Last'][exp.last_idx];
        indicators[exp.last_idx] = true;
    }

    function nameMatch(perfomed) {
        return perfomed === exp.name || perfomed.endsWith(exp.name);
    }

    const rsteps = steps.slice(-3).reverse();
    let found = false;
    for (let j = 0; j < 3; j++) {
        const performed = rsteps[j];
        if (!performed) continue;
        if (!counted[j] && nameMatch(performed)) {
            if (exp.any) {
                found = true;
            } else if (exp.notlast && j !== 0) {
                found = true;
            } else if (exp.last_idx === j) {
                found = true;
            }
        }
        if (found) {
            counted[j] = true;
            break;
        }
    }

    if (!found) {
        valid = false;
    }

    const txt = `${name} ${hitWhen}`
    return [valid, indicators, txt];
}

/**
 * Refreshes the expected steps UI based on current rule configuration
 * Updates visual indicators and validates current progress against expected rules
 */
function refreshExpected() {
    // Clear all expected step displays
    expectedEls.forEach(el => el.replaceChildren([]));
    
    // Track which performed steps have been matched to avoid double-counting
    let counted = [false, false, false];
    
    // Assume solution is valid until proven otherwise
    onValidSolution = true;
    
    // Process each expected step position (last 3 steps)
    stepsEl.forEach((stEl, i) => {
        const exp = expected[i];
        const el = expectedEls[i];
        
        if (exp) {
            // Validate this expected step against performed steps
            const [valid, indicators, txt] = expectationForStep(i, counted);
            
            // Set tooltip and visual representation
            el.dataset.tooltip = txt;
            const newChild = document.createElement('div');
            newChild.dataset.tooltip = txt;
            newChild.classList = 'bg ' + exp.name;
            el.appendChild(newChild);
            
            // Color-code the step: green if satisfied, orange if not
            stEl.classList = valid ? 'green' : 'orange';
            
            // Update position indicators (Last, Second Last, Third Last)
            const indicatorsEl = stEl.getElementsByClassName('indicator');
            indicators.forEach((set, i) => {
                indicatorsEl[i].classList = set ? 'indicator active' : 'indicator';
            });
            
            // Track overall solution validity
            onValidSolution &&= valid;
        } else {
            // No expected step defined - show default tooltips
            const defaultExpectedTooltips = [
                "Select Last Step",
                "Select Second Last Step",
                "Select Third Last Step"
            ];
            el.dataset.tooltip = defaultExpectedTooltips[i];
            stEl.classList = '';
        }
    });
    refreshStepList(); // Update step list every time expected changes
}

/**
 * Core dynamic programming algorithm to find optimal step sequences
 * This function calculates the minimum number of steps needed to reach any position
 * on the anvil slider from a given starting position.
 * 
 * @param {number[]} V - Array of step values (anvil action values)
 * @param {number} start - Starting position on the slider (0-150)
 * @param {boolean} returnToStart - Whether we need to return to the starting position
 * @param {number} min - Minimum valid slider position (default 0)
 * @param {number} max - Maximum valid slider position (default 150)
 * @returns {Array[]} Array where index i contains the optimal step sequence to reach position i
 */
function calculateSteps(V, start = 0, returnToStart = false, min = 0, max = 150) {
    // Dynamic programming arrays
    // dp[i] = minimum steps to reach position i from start
    const dp = Array(max + 1).fill(Infinity);
    // choices[i] = the actual sequence of step values to reach position i
    const choices = dp.map(() => []);
    
    // Initialize starting conditions
    if (!returnToStart) {
        // Normal mode: we start at 'start' position with 0 steps
        dp[start] = 0;
    } else {
        // Return to start mode: first step from start position costs 1
        V.forEach(v => {
            const i = start + v;
            if (i >= min && i <= max) {
                dp[i] = 1;
                choices[i].push(v);
            }
        });
    }

    // Bellman-Ford-style relaxation to find shortest paths
    // Continue until no more improvements can be made
    for (let changed = true; changed;) {
        changed = false;
        
        // Try each possible step value
        V.forEach(v => {
            // For each position that could be reached by this step
            for (let j = Math.max(v, min); j <= max; j++) {
                let i = j - v; // Previous position that leads to j with step v
                if (i >= min && i <= max) {
                    const u = dp[i]; // Steps needed to reach position i
                    
                    // If we found a better path to position j
                    if (dp[j] > u + 1) {
                        changed = true;
                        dp[j] = u + 1;
                        // Record the complete sequence: previous sequence + new step
                        choices[j] = choices[i].concat([v]);
                    }
                }
            }
        });
    }

    return choices;
}

function refreshHints(greenProgress = undefined) {
    function findGoodSolution(target, ending, include = []) {
        const steps = choices[target];
        if (!steps || steps.length == 0) return;

        const stepsMustMatch = steps.slice(-ending.length);

        const allMatch = ending.every(v => {
            const matchIdx = stepsMustMatch.indexOf(v);
            if (matchIdx > -1) {
                stepsMustMatch.splice(matchIdx, 1);
                return true;
            }
        });
        if (allMatch) {
            const sliceEnd = -ending.length || undefined;
            return steps.slice(0, sliceEnd).concat(ending, include.reverse());
        } else {
            const newEnding = [...ending];
            const last = newEnding.pop();
            return findGoodSolution(target - last, newEnding, include.concat(last));
        }
    };

    function makePossibleEnds(expected) {
        let end = expected.slice(-3);
        const Wildcard = {};
        end = Array(3 - end.length).fill(Wildcard).concat(end);
        const permutationsNums = [
            [0, 1, 2], [0, 2, 1],
            [1, 0, 2], [1, 2, 0],
            [2, 0, 1], [2, 1, 0]
        ];
        function isValidPermutation(p) {
            let valid = true;
            for (let i = 0; i < p.length; i++) {
                let e = p[i];
                if (e == Wildcard) continue;
                if (e == undefined) continue;
                else if (e.notlast) {
                    if (i == p.length-1) {
                        valid = false;
                        break;
                    }
                } else if (!e.any && e.last_idx !== undefined && 2 - e.last_idx !== i) {
                    valid = false;
                    break;
                }
            }
            return valid;
        }

        const permutations = permutationsNums.map(idxl => idxl.map(i => end[i])).filter(isValidPermutation);
        for (const i in permutations) {
            let p = permutations[i].map(v => {
                if (v == Wildcard) return Wildcard;
                else return stepMap[v.name] || 0;
            });
            let lastidx = -1;
            while (p[lastidx+1] == Wildcard) {
                lastidx++;
            }
            if (lastidx > -1) {
                p = p.slice(lastidx+1)
            }
            permutations[i] = p;
        }

        let ends = permutations;
        let resolveWildcard;
        do {
            resolveWildcard = false;

            let newEnds = [];
            for (const i in ends) {
                let p = ends[i];

                let idx = p.indexOf(Wildcard);
                let anyhitidx = p.indexOf(0);
                if (anyhitidx !== -1) {
                    ['hard-hit', 'medium-hit', 'light-hit'].map(s => {
                        let newp = p.slice();
                        newp[anyhitidx] = stepMap[s];
                        return newp;
                    }).forEach(v =>
                        newEnds.push(v)
                    );
                    resolveWildcard = true;
                } else if (idx == -1) {
                    newEnds.push(p);
                } else {
                    Object.values(stepMap).map(s => {
                        let newp = p.slice();
                        newp[idx] = s;
                        return newp;
                    }).forEach(v =>
                        newEnds.push(v)
                    );
                    resolveWildcard = true;
                }
            }
            ends = newEnds;
        } while (resolveWildcard);

        return ends;
    }

    function calculateResult(mustTake) {
        const result = findGoodSolution(red, mustTake);
        let impossible = false;
        if (!result) {
            impossible = true;
        } else {
            let sum = green;
            for (const s of result) {
                sum += s;
                if (sum < 0 || sum > 150) {
                    impossible = true;
                    break;
                }
            }
        }
        if (!impossible) {
            return result;
        }
    }
    if (greenProgress === undefined) {
        greenProgress = getProgress(greenSlider);
    }
    const green = greenProgress;
    const red = getProgress(redSlider);
    const returnToStart = red === green && !onValidSolution;
    const choices = calculateSteps(Object.values(stepMap), green, returnToStart);
    const bestResult = makePossibleEnds(expected)
        .map(calculateResult)
        .filter(v => v !== undefined)
        .sort((a, b) => a.length - b.length)[0];
    
    if (bestResult) {
        nextSteps = bestResult.map(valueToStep).reverse();
    } else {
        nextSteps = undefined;
    }
    refreshNextHints();
}

function extractDataFromImage(buffer, w, h) {
    function findPixel(p, fromY = 0, fromX = 0, tolerance = 30) {
        let idx = (fromY * w + fromX) * 4;
        for (let y = fromY; y < h; y++) {
            for (let x = fromX; x < w; x++, idx += 4) {
                const dr = Math.abs(p[0] - buffer[idx]);
                const dg = Math.abs(p[1] - buffer[idx + 1]);
                const db = Math.abs(p[2] - buffer[idx + 2]);
                if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
                    return [x, y];
                }
            }
            fromX = 0;
        }
        return [-1, -1];
    }

    function findPixelReverse(p, fromY = h-1, fromX = w-1, tolerance = 30) {
        let idx = (fromY * w + fromX) * 4;
        for (let y = fromY; y >= 0; y--) {
            for (let x = fromX; x >= 0; x--, idx -= 4) {
                const dr = Math.abs(p[0] - buffer[idx]);
                const dg = Math.abs(p[1] - buffer[idx + 1]);
                const db = Math.abs(p[2] - buffer[idx + 2]);
                if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
                    return [x, y];
                }
            }
            fromX = w-1;
        }
        return [-1, -1];
    }

    function scanY(p, fromY = 0, fromX = 0, tolerance = 30) {
        let start = findPixel(p, fromY, fromX, tolerance);

        let pos = [...start];
        pos[1] += 1;
        let lastpos = start;
        while (pos[0] !== -1 && pos[0] === start[0] && pos[1] - lastpos[1] <= 1) {
            const lastY = lastpos[1];
            lastpos = pos;
            pos = findPixel(p, lastY + 1, start[0], tolerance);
        }

        return [start[0], start[1], lastpos[1] - start[1] + 1];
    }

    function scanX(p, fromY = 0, fromX = 0, reverse = false, tolerance = 30) {
        const dir = reverse ? -1 : 1;
        const findFn = reverse ? findPixelReverse : findPixel;
        let start = findFn(p, fromY, fromX, tolerance);

        let pos = [...start];
        pos[0] += dir;
        let lastpos = start;
        while (pos[1] !== -1 && pos[1] === start[1] && dir * (pos[0] - lastpos[0]) <= 1) {
            const lastX = lastpos[0];
            lastpos = pos;
            pos = findFn(p, start[1], lastX + dir, tolerance);
        }

        const furthest = reverse ? Math.min : Math.max;
        return [furthest(start[0], lastpos[0]), start[1], Math.abs(lastpos[0] - start[0]) + 1];
    }

    const greenSliderColor = [0, 255, 6];
    const redSliderColor = [255, 0, 0];
    const whiteColor = [255, 255, 255];

    const [redX, redY, redH] = scanY(redSliderColor);
    if (redX === -1 || redY === -1 || redH === -1) return; // red slider not found
    
    const scale = Math.floor(redH / 2);
    if (redH % scale !== 0) return; // incorrect size
    
    const [greenX, greenY, greenH] = scanY(greenSliderColor, redY + redH);
    if (greenY !== redY + redH + 5 * scale) return;
    const [, , redW] = scanX(redSliderColor, redY, redX);
    const [, , greenW] = scanX(greenSliderColor, greenY, greenX);
    if (greenX === -1 || greenY === -1 || greenH === -1) return; // green slider not found
    if (greenH !== redH || redW !== greenW) return; // green and red sliders have different sizes

    const [startX,,] = scanX(whiteColor, greenY, greenX, true);
    if (startX === -1) return;

    const greenDist = greenX - startX;
    const redDist = redX - startX;

    const greenProgress = greenDist / scale - 3;
    const redProgress = redDist / scale - 3;

    updateProgress(greenSlider, greenProgress);
    updateProgress(redSlider, redProgress);
    refreshHints();
}

/**
 * Initialize number input validation and synchronization
 * Called after DOM is ready to ensure elements exist
 */
function initializeNumberInputs() {
    // Cache number inputs for bidirectional sync
    numberInputs = document.querySelectorAll('.slider-inputs input[type="number"]');
    
    // Add event listeners for number inputs with enhanced validation
    numberInputs.forEach((input, index) => {
        const sliderName = index === 0 ? 'Green' : 'Red';
        
        input.addEventListener('input', (ev) => {
            if (syncInProgress) return; // Prevent infinite loop
            
            let value = parseInt(input.value, 10);
            
            // Validate and show error tooltip if out of range
            if (isNaN(value) || value < 0 || value > 150) {
                input.style.borderColor = 'red';
                if (isNaN(value)) {
                    utils.displayError(`${sliderName} slider: Please enter a valid number`, input);
                } else if (value < 0) {
                    utils.displayError(`${sliderName} slider: Value must be at least 0`, input);
                } else if (value > 150) {
                    utils.displayError(`${sliderName} slider: Value cannot exceed 150`, input);
                }
                return;
            } else {
                input.style.borderColor = '';
            }
            
            // Clamp value to valid range (defensive programming)
            value = Math.min(150, Math.max(0, value));
            
            // Update corresponding slider
            const slider = index === 0 ? greenSlider : redSlider;
            updateProgress(slider, value);
            
            // Refresh hints if green slider changed
            if (index === 0) {
                refreshHints();
            }
        });
        
        input.addEventListener('blur', (ev) => {
            let value = parseInt(input.value, 10);
            
            // Validate on blur and show persistent error tooltip
            if (isNaN(value) || value < 0 || value > 150) {
                input.style.borderColor = 'red';
                if (isNaN(value)) {
                    utils.displayError(`${sliderName} slider: Invalid input - please enter a number between 0-150`, input);
                    input.value = ''; // Clear invalid input
                } else if (value < 0) {
                    utils.displayError(`${sliderName} slider: Value ${value} is too low - minimum is 0`, input);
                    input.value = '0';
                    value = 0;
                } else if (value > 150) {
                    utils.displayError(`${sliderName} slider: Value ${value} is too high - maximum is 150`, input);
                    input.value = '150';
                    value = 150;
                }
            } else {
                input.style.borderColor = '';
                // Ensure the value is properly clamped and set
                value = Math.min(150, Math.max(0, value));
                input.value = value;
            }
            
            // Update corresponding slider if we have a valid value
            if (!isNaN(value) && value >= 0 && value <= 150) {
                const slider = index === 0 ? greenSlider : redSlider;
                updateProgress(slider, value);
                
                // Refresh hints if green slider changed
                if (index === 0) {
                    refreshHints();
                }
            }
        });
    });
}

window.addEventListener('paste', async ev => {
    const data = ev.clipboardData;
    const blob = data.items[0].getAsFile();
    if (blob && blob.type.startsWith('image')) {
        ev.preventDefault();
        const img = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', {
            colorSpace: 'srgb'
        });
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const buf = ctx.getImageData(0, 0, img.width, img.height);
        extractDataFromImage(buf.data, buf.width, buf.height);
        canvas.remove();
    }
});

// Recipe Management Functions
function loadRecipes() {
    const recipes = JSON.parse(localStorage.getItem('recipes') || '[]');
    return recipes;
}

function saveRecipe(recipe) {
    const recipes = loadRecipes();
    const existingIndex = recipes.findIndex(r => r.name === recipe.name);
    if (existingIndex !== -1) {
        if (!confirm(`Recipe "${recipe.name}" exists. Overwrite?`)) return;
        recipes[existingIndex] = recipe;
    } else {
        recipes.push(recipe);
    }
    localStorage.setItem('recipes', JSON.stringify(recipes));
    populateRecipeList();
}

function deleteRecipe(name) {
    let recipes = loadRecipes();
    recipes = recipes.filter(r => r.name !== name);
    localStorage.setItem('recipes', JSON.stringify(recipes));
    populateRecipeList();
    // Clear selection if deleted recipe was selected
    const select = document.getElementById('recipeList');
    if (select.value === name) {
        select.value = '';
    }
}

function renameRecipe(oldName, newName) {
    const recipes = loadRecipes();
    const found = recipes.find(r => r.name === oldName);
    if (!found) {
        alert(`Recipe "${oldName}" not found.`);
        return;
    }
    if (recipes.find(r => r.name === newName)) {
        alert(`Recipe "${newName}" already exists.`);
        return;
    }
    found.name = newName;
    localStorage.setItem('recipes', JSON.stringify(recipes));
    populateRecipeList();
    // Update selection if renamed recipe was selected
    const select = document.getElementById('recipeList');
    if (select.value === oldName) {
        select.value = newName;
    }
}

function populateRecipeList() {
    const select = document.getElementById('recipeList');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select Recipe --</option>';
    
    const recipes = loadRecipes();
    recipes.forEach(recipe => {
        const option = document.createElement('option');
        option.value = recipe.name;
        option.textContent = recipe.name;
        select.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && recipes.find(r => r.name === currentValue)) {
        select.value = currentValue;
    }
}

function getCurrentRecipeData() {
    // Save current expected rules instead of text input
    const redProgress = getProgress(redSlider);
    const greenProgress = getProgress(greenSlider);
    return { expected: [...expected], redProgress, greenProgress };
}

function loadRecipeToUI(recipe) {
    // Clear current state
    steps = [];
    
    // Load expected rules (for new format) or convert from old text format
    if (recipe.expected) {
        expected = [...recipe.expected];
    } else if (recipe.rulesText) {
        // Legacy support: convert old text rules to expected format
        expected = [];
        // For now, just clear - user will need to re-configure
    } else {
        expected = [];
    }
    
    // Load slider values
    updateProgress(redSlider, recipe.redProgress);
    updateProgress(greenSlider, recipe.greenProgress);
    
    // Refresh the UI
    refreshExpected();
    refreshHints();
}

/**
 * Initialize step list functionality
 * Creates the #sequenceList in the .full-sequence container
 */
function initializeStepList() {
    const fullSequenceContainer = document.querySelector('.full-sequence');
    if (!fullSequenceContainer) return;
    
    // Create the ul#sequenceList if it doesn't exist
    let sequenceList = document.getElementById('sequenceList');
    if (!sequenceList) {
        sequenceList = document.createElement('ul');
        sequenceList.id = 'sequenceList';
        sequenceList.style.listStyle = 'none';
        sequenceList.style.padding = '0';
        sequenceList.style.margin = '0';
        sequenceList.style.fontFamily = 'Minecraft';
        sequenceList.style.fontSize = '12px';
        sequenceList.style.color = 'white';
        sequenceList.style.maxHeight = '200px';
        sequenceList.style.overflowY = 'auto';
        fullSequenceContainer.appendChild(sequenceList);
    }
    
    // Add copy all button
    let copyAllButton = document.getElementById('copyAllSteps');
    if (!copyAllButton) {
        copyAllButton = document.createElement('button');
        copyAllButton.id = 'copyAllSteps';
        copyAllButton.textContent = '📋 Copy Optimal Steps';
        copyAllButton.style.fontFamily = 'Minecraft';
        copyAllButton.style.fontSize = '16px';
        copyAllButton.style.padding = '4px 8px';
        copyAllButton.style.marginBottom = '8px';
        copyAllButton.style.backgroundColor = '#444';
        copyAllButton.style.color = 'white';
        copyAllButton.style.border = '1px solid #666';
        copyAllButton.style.cursor = 'pointer';
        copyAllButton.addEventListener('click', copyAllSteps);
        fullSequenceContainer.insertBefore(copyAllButton, sequenceList);
    }
}

/**
 * Populate #sequenceList with optimal remaining steps
 */
function refreshStepList() {
    const sequenceList = document.getElementById('sequenceList');
    if (!sequenceList) return;

    // Clear existing list items
    sequenceList.innerHTML = '';

    // Get the optimal sequence from nextSteps (calculated by refreshHints)
    if (!nextSteps || nextSteps.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No optimal steps available - set expected rules first';
        emptyItem.style.color = '#888';
        emptyItem.style.padding = '4px';
        emptyItem.style.fontStyle = 'italic';
        emptyItem.style.fontSize = '12px';
        sequenceList.appendChild(emptyItem);
        return;
    }

    // Compress consecutive identical steps
    const compressedSteps = compressStepSequence(nextSteps);
    
    // Calculate current progress for running totals
    const currentProgress = getProgress(greenSlider);
    let runningProgress = currentProgress;

    compressedSteps.forEach((stepGroup, index) => {
        const { stepName, count } = stepGroup;
        const stepValue = stepMap[stepName] || 0;
        const totalValue = stepValue * count;
        const nextProgress = Math.max(0, Math.min(150, runningProgress + totalValue));
        const progressText = `${runningProgress} → ${nextProgress}`;

        const li = document.createElement('li');
        li.style.fontSize = '12px';
        li.style.padding = '2px 4px';
        li.style.margin = '1px 0';
        li.style.backgroundColor = index % 2 === 0 ? '#333' : '#444';
        li.style.border = '1px solid #555';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        const stepInfo = document.createElement('span');
        const displayName = count > 1 ? `${count} x ${nameMap[stepName]}` : nameMap[stepName];
        const valueDisplay = totalValue > 0 ? `+${totalValue}` : `${totalValue}`;
        stepInfo.textContent = `${index + 1}. ${displayName} (${valueDisplay}) - Progress ${progressText}`;
        
        const copyIcon = document.createElement('span');
        copyIcon.textContent = '📋';
        copyIcon.style.cursor = 'pointer';
        copyIcon.style.marginLeft = '8px';
        copyIcon.style.padding = '2px';
        copyIcon.title = 'Copy this step group';
        copyIcon.addEventListener('click', () => copyStepGroupToClipboard(stepName, count));
        
        li.appendChild(stepInfo);
        li.appendChild(copyIcon);
        sequenceList.appendChild(li);
        
        // Update running progress for next iteration
        runningProgress = nextProgress;
    });
}

/**
 * Compress a sequence of steps by grouping consecutive identical steps
 * @param {string[]} stepSequence - Array of step names
 * @returns {Array} Array of {stepName, count} objects
 */
function compressStepSequence(stepSequence) {
    if (!stepSequence || stepSequence.length === 0) return [];
    
    const compressed = [];
    let currentStep = stepSequence[0];
    let currentCount = 1;
    
    for (let i = 1; i < stepSequence.length; i++) {
        if (stepSequence[i] === currentStep) {
            currentCount++;
        } else {
            compressed.push({ stepName: currentStep, count: currentCount });
            currentStep = stepSequence[i];
            currentCount = 1;
        }
    }
    
    // Don't forget the last group
    compressed.push({ stepName: currentStep, count: currentCount });
    
    return compressed;
}

/**
 * Copy all optimal steps to clipboard
 */
function copyAllSteps() {
    if (!nextSteps || nextSteps.length === 0) {
        alert('No optimal steps to copy - set expected rules first');
        return;
    }
    
    const stepsList = nextSteps.map(step => nameMap[step]).join(', ');
    navigator.clipboard.writeText(stepsList).then(() => {
        // Visual feedback
        const button = document.getElementById('copyAllSteps');
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.backgroundColor = '#0a5d00';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#444';
        }, 1500);
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

/**
 * Copy step group to clipboard
 */
function copyStepGroupToClipboard(stepName, count) {
    const displayName = nameMap[stepName];
    const text = count > 1 ? `${count} x ${displayName}` : displayName;
    navigator.clipboard.writeText(text).then(() => {
        // Could add visual feedback here if needed
    }).catch(() => {
        alert('Failed to copy step group to clipboard');
    });
}

/**
 * Initialize recipe management system
 * Called after DOM is ready to ensure elements exist
 */
function initializeRecipeManagement() {
    // Initialize recipe list on page load
    populateRecipeList();
    
    // Recipe Management Event Listeners
    const saveButton = document.getElementById('saveRecipe');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const name = prompt('Enter recipe name:');
            if (!name || !name.trim()) return;
            
            const recipeData = getCurrentRecipeData();
            const recipe = { name: name.trim(), ...recipeData };
            saveRecipe(recipe);
        });
    }
    
    const recipeList = document.getElementById('recipeList');
    if (recipeList) {
        recipeList.addEventListener('change', (event) => {
            const selectedName = event.target.value;
            if (!selectedName) return;
            
            const recipes = loadRecipes();
            const selectedRecipe = recipes.find(r => r.name === selectedName);
            if (selectedRecipe) {
                loadRecipeToUI(selectedRecipe);
            }
        });
    }
    
    // Gear icon click to show/hide context menu
    const gearIcon = document.getElementById('gearIcon');
    if (gearIcon) {
        gearIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            const menu = document.getElementById('recipeMenu');
            const select = document.getElementById('recipeList');
            
            if (!select || !select.value) {
                alert('Please select a recipe first.');
                return;
            }
            
            if (menu) {
                if (menu.style.display === 'none') {
                    menu.style.display = 'block';
                } else {
                    menu.style.display = 'none';
                }
            }
        });
    }
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        const menu = document.getElementById('recipeMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    });
    
    // Rename recipe
    const renameButton = document.getElementById('renameRecipe');
    if (renameButton) {
        renameButton.addEventListener('click', () => {
            const select = document.getElementById('recipeList');
            if (!select) return;
            
            const oldName = select.value;
            if (!oldName) return;
            
            const newName = prompt('Enter new recipe name:', oldName);
            if (!newName || !newName.trim() || newName.trim() === oldName) return;
            
            renameRecipe(oldName, newName.trim());
            const menu = document.getElementById('recipeMenu');
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }
    
    // Delete recipe
    const deleteButton = document.getElementById('deleteRecipe');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const select = document.getElementById('recipeList');
            if (!select) return;
            
            const name = select.value;
            if (!name) return;
            
            if (confirm(`Are you sure you want to delete recipe "${name}"?`)) {
                deleteRecipe(name);
            }
            const menu = document.getElementById('recipeMenu');
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }
}
