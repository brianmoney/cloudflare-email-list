#!/usr/bin/env node

/**
 * Script to populate email groups in Cloudflare KV from emails.csv
 * 
 * Usage: node scripts/populate-group.js <forward-name>
 * 
 * Example: node scripts/populate-group.js team
 * This will create a group called "team" with all emails from emails.csv
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the forward name from command line arguments
const forwardName = process.argv[2];

if (!forwardName) {
    console.error('Error: Please provide a forward name as an argument');
    console.error('Usage: node scripts/populate-group.js <forward-name>');
    console.error('Example: node scripts/populate-group.js team');
    process.exit(1);
}

// Path to the emails.csv file
const csvPath = path.join(__dirname, '../emails.csv');

// Check if emails.csv exists
if (!fs.existsSync(csvPath)) {
    console.error(`Error: emails.csv not found at ${csvPath}`);
    process.exit(1);
}

try {
    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse the CSV content
    const lines = csvContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    // Process each line to extract email addresses
    const emailAddresses = [];
    
    for (const line of lines) {
        // Handle cases where there might be multiple emails in one line (comma-separated)
        if (line.includes(',')) {
            // Remove quotes and split by comma
            const emails = line.replace(/"/g, '').split(',').map(email => email.trim());
            emailAddresses.push(...emails);
        } else {
            emailAddresses.push(line);
        }
    }
    
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emailAddresses.filter(email => emailRegex.test(email));
    const invalidEmails = emailAddresses.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
        console.warn('Warning: Found invalid email addresses:');
        invalidEmails.forEach(email => console.warn(`  - ${email}`));
        console.warn('These will be skipped.\n');
    }
    
    console.log(`Found ${validEmails.length} valid email addresses`);
    console.log(`Creating group "${forwardName}" with these emails:\n`);
    
    // Display the emails that will be added
    validEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
    });
    
    // Create the JSON value for KV storage
    const kvValue = JSON.stringify(validEmails);
    
    // Create a temporary file with the JSON data
    const tempFile = path.join(__dirname, '../temp-emails.json');
    fs.writeFileSync(tempFile, kvValue);
    
    console.log(`\nUploading to KV namespace with key: "${forwardName}"`);
    
    // Use wrangler to put the data into KV
    const wranglerCommand = `wrangler kv key put "${forwardName}" --binding EMAIL_LIST --path "${tempFile}" --preview false --remote`;
    
    try {
        execSync(wranglerCommand, { stdio: 'inherit' });
        console.log(`\n✅ Successfully created email group "${forwardName}"`);
        console.log(`📧 Emails sent to ${forwardName}@yourdomain.com will be forwarded to ${validEmails.length} recipients`);
    } catch (error) {
        console.error(`\n❌ Error uploading to KV: ${error.message}`);
        console.error('\nMake sure you have:');
        console.error('1. Created the KV namespace: npm run setup-kv');
        console.error('2. Updated wrangler.jsonc with the correct namespace ID');
        console.error('3. Authenticated with Cloudflare: wrangler auth login');
        process.exit(1);
    } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
    
} catch (error) {
    console.error(`Error reading or processing emails.csv: ${error.message}`);
    process.exit(1);
}
