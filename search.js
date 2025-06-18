// search.js - Global Search and Highlighting with Navigation
class SearchEngine {
    constructor() {
        this.searchTerm = '';
        this.isSticky = false;
        this.searchHistory = [];
        this.maxHistoryLength = 10;
        this.currentMatchIndex = 0;
        this.totalMatches = 0;
        this.searchMatches = [];
    }

    setSearchTerm(term) {
        this.searchTerm = term.toLowerCase();
        this.addToHistory(term);
        this.currentMatchIndex = 0;
        this.searchMatches = [];
    }

    addToHistory(term) {
        if (term && term.trim() !== '') {
            // Remove if already exists
            this.searchHistory = this.searchHistory.filter(item => item !== term);
            // Add to beginning
            this.searchHistory.unshift(term);
            // Keep only last N items
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryLength);
        }
    }

    getSearchHistory() {
        return this.searchHistory;
    }

    search(data, term) {
        if (!term || term.trim() === '') {
            this.totalMatches = 0;
            this.currentMatchIndex = 0;
            this.searchMatches = [];
            return data;
        }

        this.setSearchTerm(term);
        
        const filteredData = data.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(this.searchTerm);
            });
        });

        // Count total matches across all cells
        this.countMatches(filteredData);
        
        return filteredData;
    }

    countMatches(data) {
        this.searchMatches = [];
        this.totalMatches = 0;
        
        if (!this.searchTerm) return;

        data.forEach((row, rowIndex) => {
            Object.entries(row).forEach(([column, value]) => {
                if (value !== null && value !== undefined) {
                    const cellValue = String(value).toLowerCase();
                    let index = cellValue.indexOf(this.searchTerm);
                    while (index !== -1) {
                        this.searchMatches.push({
                            rowIndex,
                            column,
                            matchIndex: this.totalMatches,
                            cellValue: String(value)
                        });
                        this.totalMatches++;
                        index = cellValue.indexOf(this.searchTerm, index + 1);
                    }
                }
            });
        });
    }

    navigateToMatch(direction) {
        if (this.totalMatches === 0) return false;

        if (direction === 'next') {
            this.currentMatchIndex = (this.currentMatchIndex + 1) % this.totalMatches;
        } else if (direction === 'prev') {
            this.currentMatchIndex = this.currentMatchIndex === 0 
                ? this.totalMatches - 1 
                : this.currentMatchIndex - 1;
        }

        this.scrollToCurrentMatch();
        return true;
    }

    scrollToCurrentMatch() {
        const currentMatch = this.searchMatches[this.currentMatchIndex];
        if (!currentMatch) return;

        // Find the corresponding cell in the DOM
        setTimeout(() => {
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tbody tr');
                const targetRow = rows[currentMatch.rowIndex];
                if (targetRow) {
                    const cells = targetRow.querySelectorAll('td');
                    cells.forEach(cell => {
                        if (cell.textContent.includes(currentMatch.cellValue)) {
                            // Remove previous current highlight
                            document.querySelectorAll('.current-highlight').forEach(el => {
                                el.classList.remove('current-highlight');
                                el.classList.add('highlight');
                            });
                            
                            // Add current highlight
                            const highlights = cell.querySelectorAll('.highlight');
                            if (highlights.length > 0) {
                                highlights[0].classList.remove('highlight');
                                highlights[0].classList.add('current-highlight');
                                
                                // Scroll to the element
                                highlights[0].scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                    inline: 'center'
                                });
                            }
                        }
                    });
                }
            });
        }, 100);
    }

    getCurrentPosition() {
        return {
            current: this.currentMatchIndex + 1,
            total: this.totalMatches
        };
    }

    searchMultipleTerms(data, terms) {
        if (!terms || terms.length === 0) {
            return data;
        }

        return data.filter(row => {
            return terms.every(term => {
                const searchTerm = term.toLowerCase();
                return Object.values(row).some(value => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(searchTerm);
                });
            });
        });
    }

    highlight(text, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return text;
        }

        if (text === null || text === undefined) {
            return '';
        }

        const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})`, 'gi');
        let matchCount = 0;
        
        return String(text).replace(regex, (match) => {
            const currentMatch = this.searchMatches[this.currentMatchIndex];
            const isCurrentMatch = currentMatch && 
                currentMatch.matchIndex === this.currentMatchIndex && 
                matchCount === 0;
            
            matchCount++;
            
            if (isCurrentMatch) {
                return `<span class="current-highlight">${match}</span>`;
            } else {
                return `<span class="highlight">${match}</span>`;
            }
        });
    }

    highlightMultipleTerms(text, terms) {
        if (!terms || terms.length === 0) {
            return text;
        }

        if (text === null || text === undefined) {
            return '';
        }

        let result = String(text);
        terms.forEach(term => {
            if (term && term.trim() !== '') {
                const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
                result = result.replace(regex, '<span class="highlight">$1</span>');
            }
        });

        return result;
    }

escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

    initStickySearch() {
        const stickySearch = document.querySelector('.sticky-search');
        if (!stickySearch) return;

        // Add scroll event listener for sticky effect
        let ticking = false;
        const updateStickyState = () => {
            const scrollY = window.scrollY;
            const threshold = 100;

            if (scrollY > threshold && !this.isSticky) {
                stickySearch.classList.add('scrolled');
                this.isSticky = true;
            } else if (scrollY <= threshold && this.isSticky) {
                stickySearch.classList.remove('scrolled');
                this.isSticky = false;
            }
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateStickyState);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick);
    }

    performAdvancedSearch(data, options = {}) {
        const {
            term = '',
            columns = [],
            caseSensitive = false,
            exactMatch = false,
            regex = false
        } = options;

        if (!term.trim()) return data;

        return data.filter(row => {
            const searchColumns = columns.length > 0 ? columns : Object.keys(row);
            
            return searchColumns.some(column => {
                const value = row[column];
                if (value === null || value === undefined) return false;
                
                const searchValue = caseSensitive ? String(value) : String(value).toLowerCase();
                const searchTerm = caseSensitive ? term : term.toLowerCase();
                
                if (regex) {
                    try {
                        const regexPattern = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
                        return regexPattern.test(searchValue);
                    } catch (e) {
                        return false;
                    }
                } else if (exactMatch) {
                    return searchValue === searchTerm;
                } else {
                    return searchValue.includes(searchTerm);
                }
            });
        });
    }

    getSearchStatistics(originalData, filteredData, searchTerm) {
        const originalCount = originalData.length;
        const filteredCount = filteredData.length;
        const matchPercentage = originalCount > 0 ? ((filteredCount / originalCount) * 100).toFixed(1) : 0;
        
        return {
            originalCount,
            filteredCount,
            matchPercentage,
            searchTerm: searchTerm || '',
            filtered: filteredCount < originalCount
        };
    }
}

// Initialize Search Engine
window.searchEngine = new SearchEngine();