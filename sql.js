// sql.js - Advanced SQL-like Filtering Engine
class SQLFilter {
    constructor() {
        this.operators = {
            '=': (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
            '!=': (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
            '>': (a, b) => this.parseNumber(a) > this.parseNumber(b),
            '<': (a, b) => this.parseNumber(a) < this.parseNumber(b),
            '>=': (a, b) => this.parseNumber(a) >= this.parseNumber(b),
            '<=': (a, b) => this.parseNumber(a) <= this.parseNumber(b),
            'LIKE': (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
            'NOT LIKE': (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase()),
            'IN': (a, b) => {
                const values = b.split(',').map(v => v.trim().toLowerCase());
                return values.includes(String(a).toLowerCase());
            },
            'NOT IN': (a, b) => {
                const values = b.split(',').map(v => v.trim().toLowerCase());
                return !values.includes(String(a).toLowerCase());
            },
            'STARTS WITH': (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
            'ENDS WITH': (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
            'IS NULL': (a, b) => a === null || a === undefined || String(a).trim() === '',
            'IS NOT NULL': (a, b) => a !== null && a !== undefined && String(a).trim() !== ''
        };
    }

    parseNumber(value) {
        // Handle different number formats
        const cleanValue = String(value).replace(/[,$]/g, '');
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
    }

    parseCondition(condition) {
        condition = condition.trim();
        
        // Handle different operators (order matters - longer operators first)
        const sortedOps = Object.keys(this.operators).sort((a, b) => b.length - a.length);
        
        for (const op of sortedOps) {
            const index = condition.toUpperCase().indexOf(op);
            if (index > 0) {
                const column = condition.substring(0, index).trim();
                const value = condition.substring(index + op.length).trim();
                
                // Remove quotes from value
                const cleanValue = value.replace(/^['"]|['"]$/g, '');
                
                return {
                    column: column,
                    operator: op,
                    value: cleanValue,
                    evaluate: this.operators[op]
                };
            }
        }
        
        return null;
    }

    filter(data, sqlQuery) {
        try {
            if (!sqlQuery || sqlQuery.trim() === '') {
                return { data: data, error: null };
            }

            // Simple SQL WHERE clause parser
            const whereMatch = sqlQuery.match(/WHERE\s+(.+)/i);
            if (!whereMatch) {
                return { data: data, error: 'Invalid SQL: WHERE clause required' };
            }

            const whereClause = whereMatch[1];
            const conditions = this.parseWhereClause(whereClause);
            
            if (conditions.error) {
                return { data: [], error: conditions.error };
            }

            const filteredData = data.filter(row => {
                return this.evaluateConditions(row, conditions.parsed);
            });

            return { data: filteredData, error: null };
        } catch (error) {
            return { data: [], error: `SQL Error: ${error.message}` };
        }
    }

    parseWhereClause(whereClause) {
        try {
            // Handle parentheses for complex conditions
            const conditions = this.parseComplexConditions(whereClause);
            return { parsed: conditions, error: null };
        } catch (error) {
            return { parsed: [], error: error.message };
        }
    }

    parseComplexConditions(clause) {
        // Simple implementation - split by AND/OR
        const andParts = clause.split(/\s+AND\s+/i);
        const conditions = [];

        for (const part of andParts) {
            const orParts = part.split(/\s+OR\s+/i);
            if (orParts.length > 1) {
                // Handle OR conditions
                const orConditions = orParts.map(orPart => this.parseCondition(orPart.trim()));
                conditions.push({ type: 'OR', conditions: orConditions });
            } else {
                // Handle single condition
                const condition = this.parseCondition(part.trim());
                if (condition) {
                    conditions.push({ type: 'AND', condition: condition });
                }
            }
        }

        return conditions;
    }

    evaluateConditions(row, conditions) {
        for (const cond of conditions) {
            if (cond.type === 'AND') {
                if (!this.evaluateCondition(row, cond.condition)) {
                    return false;
                }
            } else if (cond.type === 'OR') {
                const orResult = cond.conditions.some(c => this.evaluateCondition(row, c));
                if (!orResult) {
                    return false;
                }
            }
        }
        return true;
    }

    evaluateCondition(row, condition) {
        if (!condition) return true;
        
        const columnValue = row[condition.column];
        if (columnValue === undefined) return false;

        return condition.evaluate(columnValue, condition.value);
    }

    getColumnSuggestions(headers) {
        return headers.map(header => ({
            name: header,
            examples: [
                `${header} = 'value'`,
                `${header} LIKE 'partial'`,
                `${header} > 100`,
                `${header} IN 'val1,val2,val3'`,
                `${header} IS NOT NULL`
            ]
        }));
    }

    getOperatorHelp() {
        return {
            'Comparison': ['=', '!=', '>', '<', '>=', '<='],
            'Text': ['LIKE', 'NOT LIKE', 'STARTS WITH', 'ENDS WITH'],
            'List': ['IN', 'NOT IN'],
            'Null Check': ['IS NULL', 'IS NOT NULL'],
            'Logical': ['AND', 'OR']
        };
    }
}

// Initialize SQL Filter
window.sqlFilter = new SQLFilter();