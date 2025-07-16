import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src';

describe('Email List Worker', () => {
	let mockKV;

	beforeEach(() => {
		// Mock KV storage
		mockKV = {
			get: async (key) => {
				if (key === 'team') {
					return JSON.stringify(['alice@example.com', 'bob@example.com']);
				}
				return null;
			},
			put: async (key, value, options) => {
				// Mock put operation
				return Promise.resolve();
			},
			delete: async (key) => {
				// Mock delete operation
				return Promise.resolve();
			},
			list: async () => {
				return {
					keys: [
						{ name: 'team', metadata: { lastModified: '2024-01-15T10:30:00Z' } }
					]
				};
			}
		};

		// Set up environment with mocked KV
		env.EMAIL_LIST = mockKV;
	});

	describe('API Endpoints', () => {
		it('should list all groups', async () => {
			const request = new Request('https://worker.example.com/api/groups', {
				method: 'GET',
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.groups).toHaveLength(1);
			expect(result.groups[0].name).toBe('team');
		});

		it('should get group recipients', async () => {
			const request = new Request('https://worker.example.com/api/groups/team', {
				method: 'GET',
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.group).toBe('team');
			expect(result.recipients).toContain('alice@example.com');
			expect(result.recipients).toContain('bob@example.com');
			expect(result.count).toBe(2);
		});

		it('should create/update group', async () => {
			const request = new Request('https://worker.example.com/api/groups/newteam', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					recipients: ['charlie@example.com', 'david@example.com']
				}),
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Group updated successfully');
			expect(result.group).toBe('newteam');
			expect(result.count).toBe(2);
		});

		it('should validate email addresses', async () => {
			const request = new Request('https://worker.example.com/api/groups/invalid', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					recipients: ['valid@example.com', 'invalid-email']
				}),
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid email addresses found');
			expect(result.invalidEmails).toContain('invalid-email');
		});

		it('should delete group', async () => {
			const request = new Request('https://worker.example.com/api/groups/team', {
				method: 'DELETE',
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Group deleted successfully');
			expect(result.group).toBe('team');
		});

		it('should return 404 for non-existent group', async () => {
			// Mock KV to return null for non-existent group
			mockKV.get = async (key) => null;

			const request = new Request('https://worker.example.com/api/groups/nonexistent', {
				method: 'GET',
			});

			const response = await SELF.fetch(request, env);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.error).toBe('Group not found');
		});
	});

	describe('Default Route', () => {
		it('should return HTML page for root path', async () => {
			const request = new Request('https://worker.example.com/', {
				method: 'GET',
			});

			const response = await SELF.fetch(request, env);
			const html = await response.text();

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('text/html');
			expect(html).toContain('Email List Forwarding Service');
		});
	});
});
