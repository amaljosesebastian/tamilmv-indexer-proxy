import sqlite3 from 'sqlite3';
import {DEFAULT_TAMILMV_URL, VERSION} from './config.js';

let db;

export function connectDatabase(dbPath = './database/manager.db') {
	return new Promise((resolve, reject) => {
		db = new sqlite3.Database(dbPath, error => {
			if (error) {
				console.error(`[v${VERSION}] Database connection error:`, error.message);
				reject(error);
			} else {
				console.log(`[v${VERSION}] Connected to the tamilmv manager database.`);
				resolve(db);
			}
		});
	});
}

export function initializeDatabaseSchema() {
	return new Promise((resolve, reject) => {
		db.run(
			'CREATE TABLE IF NOT EXISTS config (tamilmv_url TEXT, custom_search INT, custom_search_keyword TEXT)',
			async error => {
				if (error) {
					console.error(`[v${VERSION}] Schema creation error:`, error.message);
					return reject(error);
				}

				try {
					const count = await getCount();
					if (count === 0) {
						await insertDefaultConfig(DEFAULT_TAMILMV_URL);
					}

					resolve(true);
				} catch (error) {
					reject(error);
				}
			},
		);
	});
}

function getCount() {
	return new Promise((resolve, reject) => {
		db.get('SELECT COUNT(*) AS count FROM config', (error, row) => {
			if (error) {
				reject(error);
			} else {
				resolve(row ? row.count : 0);
			}
		});
	});
}

function insertDefaultConfig(defaultUrl) {
	return new Promise((resolve, reject) => {
		const stmt = db.prepare('INSERT INTO config VALUES (?, ?, ?)');
		stmt.run(defaultUrl, 0, 'movie', error => {
			if (error) {
				reject(error);
			} else {
				resolve(true);
			}
		});
	});
}

export function getConfig() {
	return new Promise((resolve, reject) => {
		db.get('SELECT * FROM config', (error, row) => {
			if (error) {
				reject(error);
			} else {
				resolve(row ? {
					...row,
					tamilMvUrl: row.tamilmv_url,
				} : null);
			}
		});
	});
}

export function updateConfig({tamilmvUrl, customSearch, customSearchKeyword}) {
	return new Promise((resolve, reject) => {
		db.run(
			'UPDATE config SET tamilmv_url=?, custom_search=?, custom_search_keyword=?',
			[tamilmvUrl, customSearch ? 1 : 0, customSearchKeyword],
			error => {
				if (error) {
					reject(error);
				} else {
					resolve(true);
				}
			},
		);
	});
}

export function updateRedirectUrl(tamilMvUrl) {
	return new Promise((resolve, reject) => {
		db.run('UPDATE config SET tamilmv_url=?', [tamilMvUrl], error => {
			if (error) {
				reject(error);
			} else {
				console.log(`[v${VERSION}] [SUCCESS] Updated URL to ${tamilMvUrl}`);
				resolve(true);
			}
		});
	});
}

export function closeDatabase() {
	return new Promise((resolve, reject) => {
		if (db) {
			db.close(error => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} else {
			resolve();
		}
	});
}
