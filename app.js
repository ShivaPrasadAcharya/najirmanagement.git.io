// app.js - Main Application Logic
class DataApp {
    constructor() {
        this.currentDataset = 'data1';
        this.originalData = {};
        this.filteredData = {};
        this.headers = {};
        this.datasetInfo = {};
        this.searchTerm = '';
        this.sqlQuery = '';
        this.showMultipleDatasets = false;
        this.sqlFilterExpanded = false;
        this.simpleConditions = [];
        this.activeFilterTab = 'simple';
        
        this.init();
    }

    init() {
        this.loadData();
        this.render();
        this.attachEvents();
        window.searchEngine.initStickySearch();
        
        // Load current dataset initially
        this.applyFiltersToCurrentDataset();
    }

    loadData() {
        // Define available datasets
        const datasets = ['data1', 'data3', 'data4', 'data5'];
        
        // Parse CSV data for each dataset
        datasets.forEach(dataset => {
            if (window[dataset]) {
                this.originalData[dataset] = this.parseCSV(window[dataset]);
                this.headers[dataset] = Object.keys(this.originalData[dataset][0] || {});
                
                // Load dataset info
                const infoVar = dataset + 'Info';
                if (window[infoVar]) {
                    this.datasetInfo[dataset] = window[infoVar];
                }
            }
        });
        
        // Set initial filtered data
        this.filteredData = JSON.parse(JSON.stringify(this.originalData));
    }

    parseCSV(csvString) {
        const lines = csvString.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = (values[index] || '').trim();
            });
            return obj;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    switchDataset(dataset) {
        this.currentDataset = dataset;
        // Clear simple conditions when switching datasets since columns change
        this.simpleConditions = [];
        this.sqlQuery = '';
        this.applyFiltersToCurrentDataset();
        this.render();
    }

    toggleMultipleDatasets() {
        this.showMultipleDatasets = !this.showMultipleDatasets;
        if (this.showMultipleDatasets) {
            this.applyFiltersToAllDatasets();
        } else {
            this.applyFiltersToCurrentDataset();
        }
        this.render();
    }

    toggleSQLFilter() {
        this.sqlFilterExpanded = !this.sqlFilterExpanded;
        this.render();
    }

    toggleFilterTab(tab) {
        this.activeFilterTab = tab;
        this.render();
    }

    addSimpleCondition() {
        const headers = this.headers[this.currentDataset] || [];
        if (headers.length === 0) return;

        this.simpleConditions.push({
            id: Date.now(),
            column: headers[0],
            operator: '=',
            value: '',
            logic: 'AND'
        });
        this.render();
    }

    removeSimpleCondition(conditionId) {
        this.simpleConditions = this.simpleConditions.filter(c => c.id !== conditionId);
        this.generateSQLFromSimpleConditions();
        this.render();
    }

    updateSimpleCondition(conditionId, field, value) {
        const condition = this.simpleConditions.find(c => c.id === conditionId);
        if (condition) {
            condition[field] = value;
            this.generateSQLFromSimpleConditions();
            this.render();
        }
    }

    generateSQLFromSimpleConditions() {
        if (this.simpleConditions.length === 0) {
            this.sqlQuery = '';
            return;
        }

        const whereClause = this.simpleConditions.map((condition, index) => {
            let clause = '';
            if (index > 0) {
                clause += ` ${condition.logic} `;
            }
            
            const value = this.formatConditionValue(condition.operator, condition.value);
            clause += `${condition.column} ${condition.operator} ${value}`;
            
            return clause;
        }).join('');

        this.sqlQuery = `WHERE ${whereClause}`;
    }

    formatConditionValue(operator, value) {
        if (!value) return "''";
        
        // Operators that don't need quotes for text
        const noQuoteOperators = ['IS NULL', 'IS NOT NULL'];
        if (noQuoteOperators.includes(operator)) {
            return '';
        }
        
        // Check if value is numeric
        const isNumeric = !isNaN(value) && !isNaN(parseFloat(value));
        
        // For IN and NOT IN operators, handle comma-separated values
        if (operator === 'IN' || operator === 'NOT IN') {
            return `'${value}'`;
        }
        
        // For comparison operators with numeric values
        if (isNumeric && ['>', '<', '>=', '<='].includes(operator)) {
            return value;
        }
        
        // Default: wrap in quotes
        return `'${value}'`;
    }

    getOperatorOptions() {
        return [
            { value: '=', label: 'equals (=)' },
            { value: '!=', label: 'not equals (!=)' },
            { value: '>', label: 'greater than (>)' },
            { value: '<', label: 'less than (<)' },
            { value: '>=', label: 'greater or equal (>=)' },
            { value: '<=', label: 'less or equal (<=)' },
            { value: 'LIKE', label: 'contains (LIKE)' },
            { value: 'NOT LIKE', label: 'does not contain (NOT LIKE)' },
            { value: 'STARTS WITH', label: 'starts with' },
            { value: 'ENDS WITH', label: 'ends with' },
            { value: 'IN', label: 'is one of (IN)' },
            { value: 'NOT IN', label: 'is not one of (NOT IN)' },
            { value: 'IS NULL', label: 'is empty (IS NULL)' },
            { value: 'IS NOT NULL', label: 'is not empty (IS NOT NULL)' }
        ];
    }

    applyFiltersToAllDatasets() {
        Object.keys(this.originalData).forEach(dataset => {
            this.applyFiltersToDataset(dataset);
        });
    }

    applyFiltersToCurrentDataset() {
        this.applyFiltersToDataset(this.currentDataset);
    }

    applyFiltersToDataset(dataset) {
        let data = [...this.originalData[dataset]];
        
        // Apply SQL filter (only to current dataset when in single mode, or all when in multiple mode)
        if ((this.showMultipleDatasets || dataset === this.currentDataset) && this.sqlQuery.trim()) {
            const sqlResult = window.sqlFilter.filter(data, this.sqlQuery);
            if (sqlResult.error) {
                this.showError(sqlResult.error);
                return;
            }
            data = sqlResult.data;
            this.clearError();
        }
        
        // Apply global search
        if (this.searchTerm.trim()) {
            data = window.searchEngine.search(data, this.searchTerm);
        }
        
        this.filteredData[dataset] = data;
    }

    showError(message) {
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            const sqlSection = document.querySelector('.sql-section');
            if (sqlSection) {
                sqlSection.appendChild(errorDiv);
            }
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    clearError() {
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    render() {
        const container = document.getElementById('root');
        container.innerHTML = this.getHTML();
        this.attachEventListeners();
    }

    getHTML() {
        const availableDatasets = Object.keys(this.originalData);
        
        let totalOriginalRecords, totalFilteredRecords;
        
        if (this.showMultipleDatasets) {
            totalOriginalRecords = Object.values(this.originalData).reduce((sum, data) => sum + data.length, 0);
            totalFilteredRecords = Object.values(this.filteredData).reduce((sum, data) => sum + data.length, 0);
        } else {
            totalOriginalRecords = this.originalData[this.currentDataset]?.length || 0;
            totalFilteredRecords = this.filteredData[this.currentDataset]?.length || 0;
        }

        const searchPosition = window.searchEngine.getCurrentPosition();

        return `
            <div class="container">
                <div class="header">
                    <h1>🗃️संवैधानिक इजलास फैसला व्यवस्थापन प्रणाली (CBDMS) </h1>
                    <p>Multi-dataset management with global search and SQL-like filtering</p>
                </div>

                <div class="sticky-search">
                    <div class="controls">
                        <div class="dataset-selector">
                            ${availableDatasets.map(dataset => {
                                const info = this.datasetInfo[dataset] || {};
                                const isActive = this.currentDataset === dataset;
                                return `<button class="dataset-btn ${isActive ? 'active' : ''}" data-dataset="${dataset}">
                                    ${info.emoji || '📄'} ${info.name || dataset}
                                </button>`;
                            }).join('')}
                            <button class="multiple-datasets-toggle ${this.showMultipleDatasets ? 'active' : ''}" onclick="window.dataApp.toggleMultipleDatasets()">
                                ${this.showMultipleDatasets ? '📋 Single View' : '📊 Multiple View'}
                            </button>
                        </div>
                        
                        <div style="display: flex; align-items: center; flex: 1; gap: 10px;">
                            <input type="text" class="search-input" placeholder="🔍 Global search across datasets..." value="${this.searchTerm}">
                            ${this.searchTerm && searchPosition.total > 0 ? `
                                <div class="search-navigation">
                                    <button class="search-nav-btn" onclick="window.searchEngine.navigateToMatch('prev')" ${searchPosition.total <= 1 ? 'disabled' : ''}>
                                        ⬆️ Prev
                                    </button>
                                    <div class="search-position">
                                        ${searchPosition.current}/${searchPosition.total}
                                    </div>
                                    <button class="search-nav-btn" onclick="window.searchEngine.navigateToMatch('next')" ${searchPosition.total <= 1 ? 'disabled' : ''}>
                                        ⬇️ Next
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        
                        <button class="help-btn">❓ Help</button>
                    </div>

                    <button class="sql-filter-toggle ${this.sqlFilterExpanded ? 'expanded' : ''}" onclick="window.dataApp.toggleSQLFilter()">
                        🔧 Advanced Filtering
                        <span class="toggle-icon">▼</span>
                    </button>

                    <div class="sql-section ${this.sqlFilterExpanded ? 'expanded' : 'collapsed'}">
                        <div class="filter-tabs">
                            <button class="filter-tab ${this.activeFilterTab === 'simple' ? 'active' : ''}" onclick="window.dataApp.toggleFilterTab('simple')">
                                🎯 Simple Filter
                            </button>
                            <button class="filter-tab ${this.activeFilterTab === 'advanced' ? 'active' : ''}" onclick="window.dataApp.toggleFilterTab('advanced')">
                                ⚡ SQL Expert
                            </button>
                        </div>

                        <div class="filter-content ${this.activeFilterTab === 'simple' ? 'active' : ''}">
                            ${this.renderSimpleFilterBuilder()}
                        </div>

                        <div class="filter-content ${this.activeFilterTab === 'advanced' ? 'active' : ''}">
                            ${this.renderAdvancedFilter()}
                        </div>
                        
                        <div class="export-section">
                            <span class="export-label">Export:</span>
                            ${this.showMultipleDatasets ? 
                                availableDatasets.map(dataset => {
                                    const info = this.datasetInfo[dataset] || {};
                                    return `<button class="export-btn" onclick="window.dataApp.exportDataset('${dataset}')">
                                        📥 ${info.name || dataset} CSV
                                    </button>`;
                                }).join('') :
                                `<button class="export-btn" onclick="window.dataApp.exportDataset('${this.currentDataset}')">
                                    📥 Export Current Table CSV
                                </button>`
                            }
                        </div>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">${totalOriginalRecords}</div>
                        <div class="stat-label">Total Records</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${totalFilteredRecords}</div>
                        <div class="stat-label">Filtered Results</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.showMultipleDatasets ? availableDatasets.length : 1}</div>
                        <div class="stat-label">${this.showMultipleDatasets ? 'Datasets' : 'Dataset'}</div>
                    </div>
                </div>

                ${this.showMultipleDatasets ? this.renderAllDataTables() : this.renderSingleDataTable()}
            </div>
        `;
    }

    renderSimpleFilterBuilder() {
        const headers = this.headers[this.currentDataset] || [];
        const operators = this.getOperatorOptions();

        return `
            <div class="simple-filter-builder">
                <div class="filter-conditions">
                    ${this.simpleConditions.map((condition, index) => `
                        <div class="filter-condition">
                            <select onchange="window.dataApp.updateSimpleCondition(${condition.id}, 'column', this.value)">
                                ${headers.map(header => 
                                    `<option value="${header}" ${condition.column === header ? 'selected' : ''}>${header}</option>`
                                ).join('')}
                            </select>
                            
                            <select onchange="window.dataApp.updateSimpleCondition(${condition.id}, 'operator', this.value)">
                                ${operators.map(op => 
                                    `<option value="${op.value}" ${condition.operator === op.value ? 'selected' : ''}>${op.label}</option>`
                                ).join('')}
                            </select>
                            
                            ${['IS NULL', 'IS NOT NULL'].includes(condition.operator) ? '' : `
                                <input type="text" 
                                       placeholder="${this.getPlaceholderForOperator(condition.operator)}"
                                       value="${condition.value}"
                                       onchange="window.dataApp.updateSimpleCondition(${condition.id}, 'value', this.value)">
                            `}
                            
                            <button class="condition-remove" onclick="window.dataApp.removeSimpleCondition(${condition.id})">
                                ✕
                            </button>
                        </div>
                        
                        ${index < this.simpleConditions.length - 1 ? `
                            <div class="condition-logic">
                                <span style="font-size: 12px; color: #6c757d;">Logic:</span>
                                <select onchange="window.dataApp.updateSimpleCondition(${this.simpleConditions[index + 1].id}, 'logic', this.value)">
                                    <option value="AND" ${this.simpleConditions[index + 1].logic === 'AND' ? 'selected' : ''}>AND</option>
                                    <option value="OR" ${this.simpleConditions[index + 1].logic === 'OR' ? 'selected' : ''}>OR</option>
                                </select>
                            </div>
                        ` : ''}
                    `).join('')}
                </div>
                
                <button class="add-condition-btn" onclick="window.dataApp.addSimpleCondition()">
                    ➕ Add Condition
                </button>
                
                ${this.simpleConditions.length > 0 ? `
                    <div class="preview-label">Generated SQL:</div>
                    <div class="preview-sql">${this.sqlQuery || 'No conditions set'}</div>
                ` : `
                    <div style="text-align: center; padding: 20px; color: #6c757d; font-style: italic;">
                        Click "Add Condition" to start building your filter
                    </div>
                `}
                
                <div class="simple-filter-controls">
                    <button class="execute-btn" onclick="window.dataApp.executeSQL()">▶️ Apply Filter</button>
                    <button class="clear-btn" onclick="window.dataApp.clearSimpleFilters()">🗑️ Clear All</button>
                </div>
            </div>
        `;
    }

    renderAdvancedFilter() {
        return `
            <div class="advanced-filter">
                <textarea class="sql-input" placeholder="Enter SQL WHERE clause for ${this.showMultipleDatasets ? 'all datasets' : (this.datasetInfo[this.currentDataset]?.name || this.currentDataset)} (e.g., WHERE Status = 'Active' AND Amount > 50000)">${this.sqlQuery}</textarea>
                <div class="sql-controls">
                    ${(this.headers[this.currentDataset] || []).map(header => 
                        `<button class="column-btn" data-column="${header}">${header}</button>`
                    ).join('')}
                    <button class="execute-btn" onclick="window.dataApp.executeSQL()">▶️ Execute</button>
                    <button class="clear-btn" onclick="window.dataApp.clearFilters()">🗑️ Clear</button>
                </div>
            </div>
        `;
    }

    getPlaceholderForOperator(operator) {
        const placeholders = {
            '=': 'Enter exact value',
            '!=': 'Enter value to exclude',
            '>': 'Enter number',
            '<': 'Enter number',
            '>=': 'Enter minimum value',
            '<=': 'Enter maximum value',
            'LIKE': 'Enter text to search',
            'NOT LIKE': 'Enter text to exclude',
            'STARTS WITH': 'Enter starting text',
            'ENDS WITH': 'Enter ending text',
            'IN': 'Enter values separated by commas',
            'NOT IN': 'Enter values to exclude (comma-separated)',
            'IS NULL': '',
            'IS NOT NULL': ''
        };
        return placeholders[operator] || 'Enter value';
    }

    clearSimpleFilters() {
        this.simpleConditions = [];
        this.sqlQuery = '';
        this.clearError();
        
        // Reset search engine state
        window.searchEngine.currentMatchIndex = 0;
        window.searchEngine.totalMatches = 0;
        window.searchEngine.searchMatches = [];
        
        if (this.showMultipleDatasets) {
            this.applyFiltersToAllDatasets();
        } else {
            this.applyFiltersToCurrentDataset();
        }
        this.render();
    }

    renderSingleDataTable() {
        const dataset = this.currentDataset;
        const data = this.filteredData[dataset] || [];
        const originalData = this.originalData[dataset] || [];
        const headers = this.headers[dataset] || [];
        const info = this.datasetInfo[dataset] || {};
        
        return `
            <div class="data-section">
                <div class="data-section-header">
                    <h2 class="data-section-title">
                        ${info.emoji || '📄'} ${info.name || dataset} Dataset
                    </h2>
                    <div class="data-section-stats">
                        <div class="mini-stat">
                            <div class="mini-stat-number">${originalData.length}</div>
                            <div class="mini-stat-label">Total</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-number">${data.length}</div>
                            <div class="mini-stat-label">Shown</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-number">${headers.length}</div>
                            <div class="mini-stat-label">Columns</div>
                        </div>
                    </div>
                </div>
                
                ${info.description ? `<p style="color: #666; margin-bottom: 15px; font-style: italic;">${info.description}</p>` : ''}
                
                ${data.length > 0 ? this.renderDataTable(data, headers, dataset) : this.renderNoResults(dataset)}
            </div>
        `;
    }

    renderAllDataTables() {
        return Object.keys(this.originalData).map(dataset => {
            const data = this.filteredData[dataset] || [];
            const originalData = this.originalData[dataset] || [];
            const headers = this.headers[dataset] || [];
            const info = this.datasetInfo[dataset] || {};
            
            return `
                <div class="data-section">
                    <div class="data-section-header">
                        <h2 class="data-section-title">
                            ${info.emoji || '📄'} ${info.name || dataset} Dataset
                        </h2>
                        <div class="data-section-stats">
                            <div class="mini-stat">
                                <div class="mini-stat-number">${originalData.length}</div>
                                <div class="mini-stat-label">Total</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-number">${data.length}</div>
                                <div class="mini-stat-label">Shown</div>
                            </div>
                            <div class="mini-stat">
                                <div class="mini-stat-number">${headers.length}</div>
                                <div class="mini-stat-label">Columns</div>
                            </div>
                        </div>
                    </div>
                    
                    ${info.description ? `<p style="color: #666; margin-bottom: 15px; font-style: italic;">${info.description}</p>` : ''}
                    
                    ${data.length > 0 ? this.renderDataTable(data, headers, dataset) : this.renderNoResults(dataset)}
                </div>
            `;
        }).join('');
    }

    renderDataTable(data, headers, dataset) {
        const searchTermToUse = this.searchTerm;
        
        return `
            <div class="data-table">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(header => `<th title="${header}">${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((row, index) => `
                                <tr data-row-index="${index}">
                                    ${headers.map(header => {
                                        const cellValue = row[header] || '';
                                        const highlightedValue = window.searchEngine.highlight(cellValue, searchTermToUse);
                                        return `<td title="${cellValue}" data-column="${header}">${highlightedValue}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderNoResults(dataset) {
        const info = this.datasetInfo[dataset] || {};
        return `
            <div class="data-table">
                <div class="no-results">
                    <h3>📭 No Results Found in ${info.name || dataset}</h3>
                    <p>Try adjusting your search criteria or SQL filter</p>
                </div>
            </div>
        `;
    }

    // Export functionality
    exportDataset(dataset) {
        const data = this.filteredData[dataset] || [];
        const headers = this.headers[dataset] || [];
        const info = this.datasetInfo[dataset] || {};
        
        if (data.length === 0) {
            alert('No data to export for ' + (info.name || dataset));
            return;
        }
        
        const csvContent = this.generateCSV(data, headers);
        const fileName = `${info.name || dataset}_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        this.downloadCSV(csvContent, fileName);
    }

    generateCSV(data, headers) {
        // Create CSV header
        const csvHeaders = headers.map(header => this.escapeCSVField(header)).join(',');
        
        // Create CSV rows
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header] || '';
                return this.escapeCSVField(value);
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }

    escapeCSVField(field) {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }

    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (navigator.msSaveBlob) { // For IE 10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    attachEvents() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    attachEventListeners() {
        // This method is called after render to attach specific event listeners
        const executeBtn = document.querySelector('.execute-btn');
        const clearBtn = document.querySelector('.clear-btn');
        const helpBtn = document.querySelector('.help-btn');

        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeSQL());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }

        if (helpBtn) {
            helpBtn.addEventListener('click', () => window.helpSystem.showModal());
        }
    }

    handleClick(e) {
        // Dataset switching
        if (e.target.classList.contains('dataset-btn')) {
            const dataset = e.target.dataset.dataset;
            this.switchDataset(dataset);
        }

        // Column button clicks
        if (e.target.classList.contains('column-btn')) {
            const column = e.target.dataset.column;
            this.insertColumn(column);
        }
    }

    handleInput(e) {
        // Global search
        if (e.target.classList.contains('search-input')) {
            this.searchTerm = e.target.value;
            this.debounce(() => {
                if (this.showMultipleDatasets) {
                    this.applyFiltersToAllDatasets();
                } else {
                    this.applyFiltersToCurrentDataset();
                }
                this.render();
            }, 300)();
        }

        // SQL input
        if (e.target.classList.contains('sql-input')) {
            this.sqlQuery = e.target.value;
        }
    }

    handleKeydown(e) {
        // Execute SQL on Ctrl+Enter
        if (e.ctrlKey && e.key === 'Enter' && e.target.classList.contains('sql-input')) {
            e.preventDefault();
            this.executeSQL();
        }

        // Search navigation with arrow keys when search input is focused
        if (e.target.classList.contains('search-input')) {
            if (e.key === 'ArrowDown' && e.ctrlKey) {
                e.preventDefault();
                window.searchEngine.navigateToMatch('next');
            } else if (e.key === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                window.searchEngine.navigateToMatch('prev');
            }
        }
    }

    insertColumn(column) {
        const sqlInput = document.querySelector('.sql-input');
        if (!sqlInput) return;

        const cursorPos = sqlInput.selectionStart;
        const textBefore = sqlInput.value.substring(0, cursorPos);
        const textAfter = sqlInput.value.substring(cursorPos);
        
        // Insert column name at cursor position
        const newText = textBefore + column + textAfter;
        sqlInput.value = newText;
        this.sqlQuery = newText;
        
        // Move cursor after inserted text
        const newCursorPos = cursorPos + column.length;
        sqlInput.setSelectionRange(newCursorPos, newCursorPos);
        sqlInput.focus();
    }

    executeSQL() {
        if (this.showMultipleDatasets) {
            this.applyFiltersToAllDatasets();
        } else {
            this.applyFiltersToCurrentDataset();
        }
        this.render();
    }

    clearFilters() {
        this.searchTerm = '';
        this.sqlQuery = '';
        this.simpleConditions = [];
        this.clearError();
        
        // Reset search engine state
        window.searchEngine.currentMatchIndex = 0;
        window.searchEngine.totalMatches = 0;
        window.searchEngine.searchMatches = [];
        
        if (this.showMultipleDatasets) {
            this.applyFiltersToAllDatasets();
        } else {
            this.applyFiltersToCurrentDataset();
        }
        this.render();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Export functionality (legacy method names for compatibility)
    exportData(dataset, format = 'csv') {
        const data = this.filteredData[dataset] || [];
        const headers = this.headers[dataset] || [];
        
        if (format === 'csv') {
            return this.generateCSV(data, headers);
        } else if (format === 'json') {
            return this.exportToJSON(data);
        }
    }

    exportToJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    // Statistics functionality
    getDatasetStatistics(dataset) {
        const data = this.filteredData[dataset] || [];
        const originalData = this.originalData[dataset] || [];
        
        return {
            totalRecords: originalData.length,
            filteredRecords: data.length,
            filterPercentage: originalData.length > 0 ? ((data.length / originalData.length) * 100).toFixed(1) : 0,
            columns: this.headers[dataset]?.length || 0
        };
    }
}

// Initialize the application
window.dataApp = new DataApp();
