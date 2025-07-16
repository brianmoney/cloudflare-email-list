/**
 * Cloudflare Worker for Email List Forwarding
 * 
 * This worker forwards incoming emails to a list of recipients stored in KV storage.
 * It supports multiple email groups and provides a simple API for managing recipients.
 */

export default {
	// Handle incoming emails
	async email(message, env, ctx) {
		try {
			const recipientAddress = message.to;
			console.log(`Processing email for: ${recipientAddress}`);
		// Extract group name from email address (e.g., group@domain.com -> group)
		const groupName = recipientAddress.split('@')[0];
		console.log(`Looking for group: ${groupName}`);
		
		// Get recipients list from KV storage
		const recipientsData = await env.EMAIL_LIST.get(groupName);
		console.log(`KV lookup result for "${groupName}":`, recipientsData);
		
		if (!recipientsData) {
			console.log(`No recipients found for group: ${groupName}`);
			// Optionally, you could forward to a default admin address
			return;
		}

			const recipients = JSON.parse(recipientsData);
			console.log(`Found ${recipients.length} recipients for group: ${groupName}`);

			// Forward email to all recipients in the group
			const forwardPromises = recipients.map(async (recipientEmail) => {
				try {
					await message.forward(recipientEmail);
					console.log(`Successfully forwarded to: ${recipientEmail}`);
				} catch (error) {
					console.error(`Failed to forward to ${recipientEmail}:`, error);
				}
			});

			await Promise.all(forwardPromises);
			console.log(`Email forwarding completed for group: ${groupName}`);
			
		} catch (error) {
			console.error('Error processing email:', error);
		}
	},

	// Handle HTTP requests for managing email lists
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// API routes for managing email lists
		if (path.startsWith('/api/')) {
			return await this.handleAPI(request, env, path, method);
		}

		// Default response with usage instructions
		return new Response(
			`
			<html>
				<head><title>Email List Manager</title></head>
				<body>
					<h1>Email List Forwarding Service</h1>
					<h2>API Endpoints:</h2>
					<ul>
						<li><strong>GET /api/groups</strong> - List all email groups</li>
						<li><strong>GET /api/groups/{groupName}</strong> - Get recipients for a group</li>
						<li><strong>POST /api/groups/{groupName}</strong> - Add recipients to a group</li>
						<li><strong>DELETE /api/groups/{groupName}</strong> - Delete a group</li>
					</ul>
					<h2>Usage:</h2>
					<p>Send emails to: <strong>groupname@yourdomain.com</strong></p>
					<p>The email will be forwarded to all recipients in the "groupname" group.</p>
				</body>
			</html>
			`,
			{
				headers: { 'Content-Type': 'text/html' },
			}
		);
	},

	// Handle API requests
	async handleAPI(request, env, path, method) {
		const pathParts = path.split('/').filter(part => part !== '');
		
		try {
			if (pathParts.length === 2 && pathParts[1] === 'groups' && method === 'GET') {
				// GET /api/groups - List all groups
				return await this.listGroups(env);
			}
			
			if (pathParts.length === 3 && pathParts[1] === 'groups') {
				const groupName = pathParts[2];
				
				switch (method) {
					case 'GET':
						return await this.getGroup(env, groupName);
					case 'POST':
						return await this.updateGroup(request, env, groupName);
					case 'DELETE':
						return await this.deleteGroup(env, groupName);
				}
			}
			
			return new Response('Not Found', { status: 404 });
		} catch (error) {
			console.error('API Error:', error);
			return new Response(
				JSON.stringify({ error: 'Internal Server Error', message: error.message }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	},

	// List all email groups
	async listGroups(env) {
		try {
			const list = await env.EMAIL_LIST.list();
			const groups = list.keys.map(key => ({
				name: key.name,
				lastModified: key.metadata?.lastModified || null
			}));
			
			return new Response(JSON.stringify({ groups }), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			throw new Error(`Failed to list groups: ${error.message}`);
		}
	},

	// Get recipients for a specific group
	async getGroup(env, groupName) {
		try {
			const recipientsData = await env.EMAIL_LIST.get(groupName);
			
			if (!recipientsData) {
				return new Response(
					JSON.stringify({ error: 'Group not found' }),
					{ status: 404, headers: { 'Content-Type': 'application/json' } }
				);
			}
			
			const recipients = JSON.parse(recipientsData);
			return new Response(JSON.stringify({ 
				group: groupName,
				recipients: recipients,
				count: recipients.length
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			throw new Error(`Failed to get group: ${error.message}`);
		}
	},

	// Update recipients for a group
	async updateGroup(request, env, groupName) {
		try {
			const body = await request.json();
			
			if (!body.recipients || !Array.isArray(body.recipients)) {
				return new Response(
					JSON.stringify({ error: 'Invalid request: recipients array required' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Validate email addresses
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const invalidEmails = body.recipients.filter(email => !emailRegex.test(email));
			
			if (invalidEmails.length > 0) {
				return new Response(
					JSON.stringify({ 
						error: 'Invalid email addresses found',
						invalidEmails: invalidEmails
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Store in KV with metadata
			await env.EMAIL_LIST.put(groupName, JSON.stringify(body.recipients), {
				metadata: {
					lastModified: new Date().toISOString(),
					count: body.recipients.length
				}
			});

			return new Response(JSON.stringify({ 
				message: 'Group updated successfully',
				group: groupName,
				recipients: body.recipients,
				count: body.recipients.length
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			throw new Error(`Failed to update group: ${error.message}`);
		}
	},

	// Delete a group
	async deleteGroup(env, groupName) {
		try {
			await env.EMAIL_LIST.delete(groupName);
			return new Response(JSON.stringify({ 
				message: 'Group deleted successfully',
				group: groupName
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			throw new Error(`Failed to delete group: ${error.message}`);
		}
	}
};
