import process from 'node:process';

export const PORT = process.env.PORT || 5000;
export const DEFAULT_TAMILMV_URL = process.env.TAMILMV_URL || 'https://www.1tamilmv.cards';
export const VERSION = '1.0.3';

export const GLOBAL_SETTINGS = {
	title: 'TamilMV Proxy Manager',
	message: 'TamilMV Proxy Manager',
};

export const KEYWORDS_TO_EXCLUDE = [
	'PreDVD',
	'720p',
	'240p',
	'480p',
	'360p',
];
