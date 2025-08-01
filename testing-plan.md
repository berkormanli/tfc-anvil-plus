# TFC Anvil - Regression Testing & Cross-Browser QA Plan

## Overview
This document outlines the comprehensive testing strategy for the TFC Anvil application across Chrome, Firefox, and Edge browsers, including manual test matrices, automated performance testing, and regression verification.

## Test Environment Setup

### Browsers Under Test
- **Chrome** (latest stable)
- **Firefox** (latest stable) 
- **Edge** (latest stable)

### Test Scenarios

## 1. GUI Scale Testing

### Test Case 1.1: Responsive Scaling
**Objective**: Verify interface scales correctly across different screen sizes and GUI scale settings

**Test Steps**:
1. Open application in each browser
2. Test at different viewport sizes:
   - Mobile: 375x667px (GUI scale: 1)
   - Tablet: 768x1024px (GUI scale: 2-3)
   - Desktop: 1920x1080px (GUI scale: 4)
3. Verify all UI elements remain proportional and clickable
4. Check tooltip positioning at different scales

**Expected Results**:
- All elements scale proportionally
- No text overlap or cutoff
- Interactive elements remain accessible
- Tooltips appear in correct positions

### Test Case 1.2: Dynamic Scale Changes
**Test Steps**:
1. Load application at default scale
2. Dynamically change browser zoom (50%, 75%, 100%, 125%, 150%)
3. Verify interface adapts correctly

**Expected Results**:
- Interface remains usable at all zoom levels
- No layout breaks or element misalignment

## 2. Page Reload Persistence Testing

### Test Case 2.1: Slider State Persistence
**Objective**: Verify slider positions persist after page reload

**Test Steps**:
1. Set green slider to position 75
2. Set red slider to position 45  
3. Reload page (F5)
4. Verify slider positions

**Expected Results**:
- Slider positions maintained after reload
- Visual indicators show correct values

### Test Case 2.2: Recipe Data Persistence
**Test Steps**:
1. Create a new recipe with specific rules
2. Save recipe to localStorage
3. Reload page
4. Verify recipe appears in dropdown
5. Load recipe and verify all data intact

**Expected Results**:
- Recipe persists in localStorage
- All recipe data loads correctly
- UI state matches saved recipe

### Test Case 2.3: Form State Persistence
**Test Steps**:
1. Enter rules in text form: "1 Hit Last\n2 Draw Not Last"
2. Apply rules
3. Reload page
4. Verify form mode and rules state

**Expected Results**:
- Form mode flag persists
- Rules text and applied state maintained

## 3. Drag vs Number Input Testing

### Test Case 3.1: Slider Drag Functionality
**Objective**: Verify drag interactions work smoothly across browsers

**Test Steps**:
1. Click and drag green slider from 0 to 150
2. Click and drag red slider from 0 to 150
3. Test drag sensitivity and smoothness
4. Verify tooltip updates during drag
5. Test with different mouse speeds

**Expected Results**:
- Smooth dragging motion without jumps
- Accurate position updates
- Tooltips update in real-time
- No performance lag during drag

### Test Case 3.2: Number Input Validation
**Test Steps**:
1. Enter valid values (0-150) in number inputs
2. Test invalid values (-1, 151, "abc", empty)
3. Verify error messaging
4. Test boundary values (0, 150)
5. Verify sync with sliders

**Expected Results**:
- Valid inputs accepted and synced to sliders
- Invalid inputs rejected with clear error messages
- Boundary values handled correctly
- No infinite loops between input and slider updates

### Test Case 3.3: Bidirectional Sync
**Test Steps**:
1. Move slider, verify number input updates
2. Change number input, verify slider moves
3. Test rapid alternating changes
4. Verify sync guard prevents infinite loops

**Expected Results**:
- Perfect synchronization between input methods
- No sync delays or inconsistencies
- Sync guard prevents infinite update loops

## 4. Recipe CRUD Operations Testing

### Test Case 4.1: Create Recipe
**Test Steps**:
1. Set up anvil state (sliders, rules)
2. Click "Save Recipe"
3. Enter recipe name "Test Recipe 1"
4. Verify recipe appears in dropdown

**Expected Results**:
- Recipe successfully saved to localStorage
- Recipe appears in dropdown list
- Recipe data matches current state

### Test Case 4.2: Read/Load Recipe
**Test Steps**:
1. Select recipe from dropdown
2. Verify all state loads correctly:
   - Slider positions
   - Rules text
   - Form mode state
   - Expected steps display

**Expected Results**:
- Complete state restoration
- UI reflects loaded recipe accurately

### Test Case 4.3: Update Recipe
**Test Steps**:
1. Load existing recipe
2. Modify sliders and rules
3. Save with same name
4. Confirm overwrite
5. Reload and verify changes

**Expected Results**:
- Overwrite confirmation appears
- Changes saved successfully
- Updated recipe loads correctly

### Test Case 4.4: Delete Recipe
**Test Steps**:
1. Select recipe from dropdown
2. Click gear icon → Delete
3. Confirm deletion
4. Verify recipe removed from dropdown

**Expected Results**:
- Deletion confirmation appears
- Recipe removed from localStorage
- Dropdown updates immediately

### Test Case 4.5: Rename Recipe
**Test Steps**:
1. Select recipe
2. Click gear icon → Rename
3. Enter new name
4. Verify rename successful

**Expected Results**:
- Recipe renamed in localStorage
- Dropdown reflects new name
- Recipe content unchanged

## 5. Legacy Click-Cycle Testing

### Test Case 5.1: Form Hidden Click-Cycle
**Objective**: Verify legacy click-cycle functionality when form is hidden

**Test Steps**:
1. Ensure rules form is not in use (useFormMode = false)
2. Click on expected step elements
3. Verify step cycling: hit → draw → punch → bend → upset → shrink → hit
4. Click on indicators to cycle position modes

**Expected Results**:
- Step cycling works when form mode disabled
- Position indicators cycle correctly
- UI updates reflect changes
- No interference from form mode

### Test Case 5.2: Form Mode vs Click-Cycle
**Test Steps**:
1. Enable form mode by applying rules
2. Attempt to click on expected steps
3. Verify click-cycle is disabled
4. Clear form mode
5. Verify click-cycle re-enabled

**Expected Results**:
- Click-cycle disabled when form mode active
- Click-cycle enabled when form mode inactive
- Smooth transition between modes

## 6. Performance Testing

### Test Case 6.1: List Rendering Performance
**Objective**: Ensure list rendering under 2ms for 50-step sequences

**Test Steps**:
1. Generate 50-step sequence
2. Measure rendering time using Performance API
3. Test in all target browsers
4. Verify performance with different GUI scales

**Performance Script**:
```javascript
// Performance measurement for list rendering
function measureListRenderPerformance() {
    const start = performance.now();
    
    // Simulate 50-step sequence rendering
    const steps = Array(50).fill().map((_, i) => ({
        type: ['hit', 'draw', 'punch', 'bend', 'upset', 'shrink'][i % 6],
        position: i
    }));
    
    // Render steps (simulate DOM updates)
    steps.forEach(step => {
        // Simulate DOM manipulation
        const element = document.createElement('div');
        element.className = `step ${step.type}`;
        // ... rendering logic
    });
    
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`List rendering time: ${renderTime}ms`);
    return renderTime;
}
```

**Expected Results**:
- Rendering time < 2ms across all browsers
- Consistent performance across GUI scales
- No memory leaks during repeated operations

### Test Case 6.2: Memory Usage Testing
**Test Steps**:
1. Monitor memory usage during extended use
2. Test recipe creation/deletion cycles
3. Verify no memory leaks

**Expected Results**:
- Stable memory usage
- No memory leaks after operations
- Garbage collection working correctly

## Browser-Specific Testing Notes

### Chrome-Specific Tests
- Test with Chrome DevTools performance profiling
- Verify CSS Grid/Flexbox rendering
- Test clipboard paste functionality for screenshots

### Firefox-Specific Tests  
- Test CSS custom properties (CSS variables) support
- Verify font rendering (Minecraft font)
- Test drag and drop behavior differences

### Edge-Specific Tests
- Test legacy CSS compatibility
- Verify JavaScript ES6+ feature support
- Test localStorage implementation

## Automated Testing Setup

### Test Runner Configuration
```javascript
// Browser test configuration
const testConfig = {
    browsers: ['chrome', 'firefox', 'edge'],
    viewport: {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1920, height: 1080 }
    },
    timeout: 30000
};
```

## Test Data Sets

### Sample Recipes for Testing
```javascript
const testRecipes = [
    {
        name: "Bronze Axe Head",
        rulesText: "1 Hit Last\n2 Draw Not Last\n3 Punch Any",
        greenProgress: 75,
        redProgress: 45
    },
    {
        name: "Iron Sword Blade", 
        rulesText: "1 Draw Last\n2 Hit Second Last",
        greenProgress: 120,
        redProgress: 90
    }
    // ... more test recipes
];
```

## Bug Tracking Template

### Issue Report Format
```
**Browser**: Chrome/Firefox/Edge
**Version**: [Browser version]
**OS**: [Operating system]
**Viewport**: [Screen size/scale]
**Steps to Reproduce**: 
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshot**: [If applicable]
**Console Errors**: [Any JavaScript errors]
```

## Test Execution Schedule

### Phase 1: Core Functionality (Week 1)
- [ ] GUI scaling tests
- [ ] Page reload persistence  
- [ ] Drag vs number input

### Phase 2: Advanced Features (Week 1-2)
- [ ] Recipe CRUD operations
- [ ] Legacy click-cycle functionality
- [ ] Performance benchmarking

### Phase 3: Cross-Browser Validation (Week 2)
- [ ] Chrome testing suite
- [ ] Firefox testing suite  
- [ ] Edge testing suite

### Phase 4: Regression Testing (Week 2)
- [ ] Full test suite execution
- [ ] Bug fixes verification
- [ ] Performance validation

## Success Criteria

### Functional Requirements
✅ All UI elements responsive across browsers  
✅ Data persistence working correctly  
✅ Input methods synchronized properly  
✅ Recipe management fully functional  
✅ Legacy features maintained  

### Performance Requirements  
✅ List rendering < 2ms for 50 steps  
✅ No memory leaks detected  
✅ Smooth user interactions  

### Browser Compatibility
✅ Chrome: Full functionality  
✅ Firefox: Full functionality  
✅ Edge: Full functionality  

## Risk Assessment

### High Risk Areas
- **Cross-browser CSS compatibility**: Different rendering engines may handle custom properties differently
- **JavaScript event handling**: Browser-specific event behavior could cause issues
- **Performance on lower-end devices**: GUI scaling and rendering performance

### Mitigation Strategies
- Progressive enhancement approach
- Polyfills for missing browser features  
- Performance budgets and monitoring
- Fallback UI for unsupported features

---

*This testing plan ensures comprehensive coverage of all TFC Anvil functionality across target browsers with specific focus on the identified test areas: GUI scales, page reload persistence, drag vs number input, recipe CRUD, legacy click-cycle functionality, and performance requirements.*
