/* eslint-disable unicorn/no-process-exit */
import process from 'node:process';
import app from './src/app.js';
import {PORT, VERSION} from './src/config.js';
import {connectDatabase, initializeDatabaseSchema, closeDatabase} from './src/db.js';

try {
	// 1. Connect to SQLite database
	await connectDatabase();

	// 2. Initialize tables and defaults
	await initializeDatabaseSchema();

	// 3. Start the HTTP server
	const server = app.listen(PORT, error => {
		if (error) {
			console.error('Error while starting server at port', PORT, error);
			closeDatabase().catch(console.error);
		} else {
			console.log('Server has been started at port', PORT, `(v${VERSION})`);
		}
	});

	// Handle graceful shutdown
	const shutdown = async signal => {
		console.log(`\nReceived ${signal}. Shutting down gracefully...`);
		server.close(async () => {
			console.log('HTTP server closed.');
			try {
				await closeDatabase();
				console.log('Database connection closed.');
				process.exit(0);
			} catch (dbError) {
				console.error('Error closing database connection:', dbError);
				process.exit(1);
			}
		});
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (initError) {
	console.error('Failed to initialize database or start server:', initError.message);
	process.exit(1);
}

