// index.js - Application Entry Point
document.addEventListener('DOMContentLoaded', function() {
    // Application is already initialized in app.js
    console.log('🚀 Advanced Data Management System loaded successfully!');
    
    // Verify all required components are loaded
    const requiredComponents = [
        'dataApp',
        'searchEngine', 
        'sqlFilter',
        'helpSystem'
    ];
    
    const missingComponents = requiredComponents.filter(component => !window[component]);
    
    if (missingComponents.length > 0) {
        console.error('❌ Missing components:', missingComponents);
        return;
    }
    
    // Check if root container exists
    const container = document.getElementById('root');
    if (!container) {
        console.error('❌ Root container not found!');
        return;
    }

    // Set up global error handling
    window.addEventListener('error', function(e) {
        console.error('💥 Application error:', e.error);
        showErrorNotification('An unexpected error occurred. Please refresh the page.');
    });

    // Set up unhandled promise rejection handling
    window.addEventListener('unhandledrejection', function(e) {
        console.error('💥 Unhandled promise rejection:', e.reason);
        showErrorNotification('A system error occurred. Please check your input and try again.');
    });

    // Set up performance monitoring
    if (window.performance && window.performance.mark) {
        window.performance.mark('app-loaded');
        
        // Log performance metrics after a short delay
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`📊 Performance metrics:
• DOM Content Loaded: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms
• Load Complete: ${perfData.loadEventEnd - perfData.loadEventStart}ms
• Total Load Time: ${perfData.loadEventEnd - perfData.navigationStart}ms`);
            }
        }, 1000);
    }

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize accessibility features
    initializeAccessibilityFeatures();
    
    // Display startup information
    displayStartupInfo();
    
    // Check for saved user preferences
    loadUserPreferences();
    
    console.log('✅ All systems initialized successfully!');
});

// Error notification system
function showErrorNotification(message) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.error-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 400px;
        font-family: inherit;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>⚠️</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: #721c24;
                font-size: 18px;
                cursor: pointer;
                margin-left: auto;
            ">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Keyboard shortcuts initialization
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+/ or F1 - Show help
        if ((e.ctrlKey && e.key === '/') || e.key === 'F1') {
            e.preventDefault();
            window.helpSystem.showModal();
        }
        
        // Ctrl+K - Focus search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl+Shift+C - Clear all filters
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (window.dataApp) {
                window.dataApp.clearFilters();
            }
        }
        
        // Ctrl+E - Export current dataset
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            if (window.dataApp) {
                window.dataApp.exportDataset(window.dataApp.currentDataset);
            }
        }
        
        // Escape - Clear search if search is focused
        if (e.key === 'Escape') {
            const searchInput = document.querySelector('.search-input');
            if (document.activeElement === searchInput) {
                searchInput.value = '';
                searchInput.blur();
                if (window.dataApp) {
                    window.dataApp.searchTerm = '';
                    window.dataApp.applyFiltersToAllDatasets();
                    window.dataApp.render();
                }
            }
        }
        
        // Number keys 1-9 - Switch datasets
        if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const datasetIndex = parseInt(e.key) - 1;
            const availableDatasets = Object.keys(window.dataApp.originalData);
            if (datasetIndex < availableDatasets.length) {
                window.dataApp.switchDataset(availableDatasets[datasetIndex]);
            }
        }
    });
}

// Accessibility features initialization
function initializeAccessibilityFeatures() {
    // Add ARIA labels and roles
    setTimeout(() => {
        // Main navigation
        const datasetButtons = document.querySelectorAll('.dataset-btn');
        datasetButtons.forEach((btn, index) => {
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', btn.classList.contains('active'));
            btn.setAttribute('tabindex', btn.classList.contains('active') ? '0' : '-1');
        });
        
        // Search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.setAttribute('aria-label', 'Global search across all datasets');
            searchInput.setAttribute('role', 'searchbox');
        }
        
        // SQL input
        const sqlInput = document.querySelector('.sql-input');
        if (sqlInput) {
            sqlInput.setAttribute('aria-label', 'SQL WHERE clause for filtering data');
            sqlInput.setAttribute('role', 'textbox');
        }
        
        // Tables
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            table.setAttribute('role', 'table');
            table.setAttribute('aria-label', 'Data table with filtering and search capabilities');
        });
        
        // Add skip links for keyboard navigation
        addSkipLinks();
    }, 100);
}

// Add skip navigation links
function addSkipLinks() {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.style.cssText = `
        position: fixed;
        top: -100px;
        left: 0;
        z-index: 10000;
        background: #000;
        color: #fff;
        padding: 10px;
        transition: top 0.3s;
    `;
    
    skipLinks.innerHTML = `
        <a href="#main-content" style="color: #fff; text-decoration: none; margin-right: 15px;">Skip to main content</a>
        <a href="#search-controls" style="color: #fff; text-decoration: none;">Skip to search controls</a>
    `;
    
    // Show skip links when focused
    skipLinks.addEventListener('focusin', () => {
        skipLinks.style.top = '0';
    });
    
    skipLinks.addEventListener('focusout', () => {
        skipLinks.style.top = '-100px';
    });
    
    document.body.insertBefore(skipLinks, document.body.firstChild);
    
    // Add ID to main content areas
    setTimeout(() => {
        const container = document.querySelector('.container');
        if (container) {
            container.id = 'main-content';
        }
        
        const stickySearch = document.querySelector('.sticky-search');
        if (stickySearch) {
            stickySearch.id = 'search-controls';
        }
    }, 100);
}

// Display startup information
function displayStartupInfo() {
    console.log(`
🔥 Advanced Data Management System v2.0

📊 Loaded Datasets:
${Object.keys(window.dataApp.originalData).map(key => {
    const info = window.dataApp.datasetInfo[key] || {};
    const count = window.dataApp.originalData[key].length;
    return `• ${info.emoji || '📄'} ${info.name || key}: ${count} records`;
}).join('\n')}

⌨️ Keyboard Shortcuts:
• Ctrl+K: Focus search
• Ctrl+Enter: Execute SQL query  
• Ctrl+/: Show help
• Ctrl+Shift+C: Clear all filters
• Ctrl+1-9: Switch datasets
• Escape: Clear search/close modals
• F1: Show help

🎯 Features:
• Real-time global search with highlighting
• SQL-like filtering with advanced operators
• Multi-dataset management with separate tables
• Responsive design for all devices
• Sticky search bar with smooth scrolling
• Comprehensive help system
• Accessibility features and keyboard navigation
• Error handling and performance monitoring

🛠️ Technical Stack:
• Vanilla JavaScript (ES6+)
• CSS3 with modern features
• Modular architecture
• Performance optimized
• Mobile responsive
    `);
}

// User preferences management
function loadUserPreferences() {
    try {
        // Note: Since localStorage is not available in this environment,
        // we'll use a simple in-memory preference system
        window.userPreferences = {
            lastUsedDataset: 'data1',
            searchHistory: [],
            preferredTheme: 'default',
            accessibilityMode: false
        };
        
        // Apply preferences if any
        if (window.userPreferences.lastUsedDataset && window.dataApp.originalData[window.userPreferences.lastUsedDataset]) {
            window.dataApp.switchDataset(window.userPreferences.lastUsedDataset);
        }
        
        console.log('📝 User preferences loaded');
    } catch (error) {
        console.warn('⚠️ Could not load user preferences:', error.message);
    }
}

// Export functionality for potential external use
window.DataManagementSystem = {
    version: '2.0.0',
    app: () => window.dataApp,
    search: () => window.searchEngine,
    sql: () => window.sqlFilter,
    help: () => window.helpSystem,
    
    // Utility functions
    exportData: (dataset, format = 'csv') => {
        return window.dataApp.exportData(dataset, format);
    },
    
    getStatistics: (dataset) => {
        return window.dataApp.getDatasetStatistics(dataset);
    },
    
    getAllDatasets: () => {
        return Object.keys(window.dataApp.originalData);
    },
    
    // Event system for extensions
    events: {
        listeners: {},
        
        on: function(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        emit: function(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        }
    }
};

// Add CSS animation for error notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .skip-links:focus-within {
        top: 0 !important;
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .highlight {
            background-color: #ffff00 !important;
            color: #000000 !important;
        }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;
document.head.appendChild(style);