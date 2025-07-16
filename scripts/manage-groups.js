#!/usr/bin/env node

/**
 * Interactive script to manage email groups
 * 
 * Usage: 
 *   node scripts/manage-groups.js       async function getGroup(async function deleteGroup(groupName) {
    console.log(`🗑️  Deleting group "${groupName}"...`);
    const result = executeWrangler(`wrangler kv key delete "${groupName}" --binding EMAIL_LIST --preview false --remote`);
    
    if (result.success) {Name) {
    console.log(`📖 Getting details for group "${groupName}"...\n`);
    const result = executeWrangler(`wrangler kv key get "${groupName}" --binding EMAIL_LIST --preview false --remote`);
    
    if (result.success) {        # Interactive mode
 *   node scripts/manage-groups.js create <name>      # Create group from emails.csv
 *   node scripts/manage-groups.js list               # List all groups
 *   node scripts/manage-groups.js get <name>         # Get group details
 *   node scripts/manage-groups.js delete <name>      # Delete group
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function executeWrangler(command) {
    try {
        const result = execSync(command, { encoding: 'utf8' });
        return { success: true, output: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createGroupFromCSV(groupName) {
    const csvPath = path.join(__dirname, '../emails.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Error: emails.csv not found at ${csvPath}`);
        return false;
    }

    try {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const emailAddresses = [];
        
        for (const line of lines) {
            if (line.includes(',')) {
                const emails = line.replace(/"/g, '').split(',').map(email => email.trim());
                emailAddresses.push(...emails);
            } else {
                emailAddresses.push(line);
            }
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = emailAddresses.filter(email => emailRegex.test(email));
        const invalidEmails = emailAddresses.filter(email => !emailRegex.test(email));
        
        if (invalidEmails.length > 0) {
            console.warn('⚠️  Warning: Found invalid email addresses:');
            invalidEmails.forEach(email => console.warn(`     ${email}`));
            console.warn('   These will be skipped.\n');
        }
        
        console.log(`📧 Found ${validEmails.length} valid email addresses`);
        console.log(`📝 Creating group "${groupName}"`);
        
        const kvValue = JSON.stringify(validEmails);
        const tempFile = path.join(__dirname, '../temp-emails.json');
        fs.writeFileSync(tempFile, kvValue);
        
        const wranglerCommand = `wrangler kv key put "${groupName}" --binding EMAIL_LIST --path "${tempFile}" --preview false --remote`;
        const result = executeWrangler(wranglerCommand);
        
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        
        if (result.success) {
            console.log(`✅ Successfully created email group "${groupName}"`);
            console.log(`📬 Emails sent to ${groupName}@yourdomain.com will be forwarded to ${validEmails.length} recipients`);
            return true;
        } else {
            console.error(`❌ Error uploading to KV: ${result.error}`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Error processing emails.csv: ${error.message}`);
        return false;
    }
}

async function listGroups() {
    console.log('📋 Listing all email groups...\n');
    const result = executeWrangler('wrangler kv key list --binding EMAIL_LIST --preview false --remote');
    
    if (result.success) {
        try {
            const keys = JSON.parse(result.output);
            if (keys.length === 0) {
                console.log('   No groups found.');
            } else {
                console.log(`   Found ${keys.length} group(s):\n`);
                keys.forEach((key, index) => {
                    console.log(`   ${index + 1}. ${key.name}`);
                });
            }
        } catch (error) {
            console.log('   ' + result.output);
        }
    } else {
        console.error(`❌ Error listing groups: ${result.error}`);
    }
}

async function getGroup(groupName) {
    console.log(`📖 Getting details for group "${groupName}"...\n`);
    const result = executeWrangler(`wrangler kv key get "${groupName}" --binding EMAIL_LIST --preview false`);
    
    if (result.success) {
        try {
            const emails = JSON.parse(result.output);
            console.log(`   Group: ${groupName}`);
            console.log(`   Recipients: ${emails.length}\n`);
            emails.forEach((email, index) => {
                console.log(`   ${index + 1}. ${email}`);
            });
        } catch (error) {
            console.log('   ' + result.output);
        }
    } else {
        console.error(`❌ Error getting group: ${result.error}`);
    }
}

async function deleteGroup(groupName) {
    console.log(`🗑️  Deleting group "${groupName}"...`);
    const result = executeWrangler(`wrangler kv key delete "${groupName}" --binding EMAIL_LIST --preview false`);
    
    if (result.success) {
        console.log(`✅ Successfully deleted group "${groupName}"`);
    } else {
        console.error(`❌ Error deleting group: ${result.error}`);
    }
}

async function interactiveMode() {
    console.log('🎛️  Email Group Manager\n');
    
    while (true) {
        console.log('Available commands:');
        console.log('  1. Create group from emails.csv');
        console.log('  2. List all groups');
        console.log('  3. Get group details');
        console.log('  4. Delete group');
        console.log('  5. Exit\n');
        
        const choice = await question('Enter your choice (1-5): ');
        console.log();
        
        switch (choice) {
            case '1':
                const groupName = await question('Enter group name: ');
                if (groupName) {
                    await createGroupFromCSV(groupName);
                }
                break;
            case '2':
                await listGroups();
                break;
            case '3':
                const getName = await question('Enter group name: ');
                if (getName) {
                    await getGroup(getName);
                }
                break;
            case '4':
                const deleteName = await question('Enter group name to delete: ');
                if (deleteName) {
                    const confirm = await question(`Are you sure you want to delete "${deleteName}"? (y/N): `);
                    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                        await deleteGroup(deleteName);
                    }
                }
                break;
            case '5':
                console.log('👋 Goodbye!');
                rl.close();
                return;
            default:
                console.log('❌ Invalid choice. Please try again.');
        }
        
        console.log('\n' + '─'.repeat(50) + '\n');
    }
}

async function main() {
    const command = process.argv[2];
    const argument = process.argv[3];
    
    if (!command) {
        await interactiveMode();
        return;
    }
    
    switch (command) {
        case 'create':
            if (!argument) {
                console.error('❌ Error: Please provide a group name');
                console.error('Usage: node scripts/manage-groups.js create <group-name>');
                process.exit(1);
            }
            const success = await createGroupFromCSV(argument);
            process.exit(success ? 0 : 1);
            break;
            
        case 'list':
            await listGroups();
            break;
            
        case 'get':
            if (!argument) {
                console.error('❌ Error: Please provide a group name');
                console.error('Usage: node scripts/manage-groups.js get <group-name>');
                process.exit(1);
            }
            await getGroup(argument);
            break;
            
        case 'delete':
            if (!argument) {
                console.error('❌ Error: Please provide a group name');
                console.error('Usage: node scripts/manage-groups.js delete <group-name>');
                process.exit(1);
            }
            await deleteGroup(argument);
            break;
            
        default:
            console.error('❌ Error: Unknown command');
            console.error('Usage: node scripts/manage-groups.js [create|list|get|delete] [group-name]');
            process.exit(1);
    }
    
    rl.close();
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    rl.close();
    process.exit(0);
});

main().catch(error => {
    console.error('❌ Unexpected error:', error);
    rl.close();
    process.exit(1);
});
