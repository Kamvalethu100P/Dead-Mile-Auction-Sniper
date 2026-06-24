const { execSync } = require('child_process');

/**
 * Executes a SQL query using the team-db CLI.
 * @param {string} sql - The SQL statement to execute.
 * @returns {Promise<any>} - The parsed JSON result.
 */
async function query(sql) {
    try {
        const escapedSql = sql.replace(/"/g, '\\"');
        const output = execSync(`team-db "${escapedSql}"`).toString();
        return JSON.parse(output);
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

module.exports = { query };
