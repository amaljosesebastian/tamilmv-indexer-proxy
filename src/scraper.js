import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import {v5 as uuid} from 'uuid';
import moment from 'moment';
import {getConfig} from './db.js';
import {KEYWORDS_TO_EXCLUDE, VERSION} from './config.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/110.0';

export function hasNonEnglishCharacters(string_) {
	// eslint-disable-next-line no-control-regex
	const regex = /[^\u0000-\u007F\dA-Za-z .,\-]+/; // eslint-disable-line no-useless-escape
	return regex.test(string_);
}

function cleanTitle(raw) {
	return raw
		.replace(/^www\.[^\s-]+\s*-\s*/i, '')
		.replace(/\s-\s/, ' ')
		.trim();
}

export async function searchMovies(keyword) {
	const config = await getConfig();
	if (!config) {
		throw new Error('Database configuration is not available.');
	}

	const tamilMvUrl = config.tamilMvUrl;
	const searchURL = `${tamilMvUrl}/search/api/search.php?q=${keyword}&priority=1&sort=title_asc&page=1&per_page=100`;
	console.log(`[v${VERSION}] Searching...`, searchURL);

	try {
		const fetchSearch = await fetch(searchURL, {
			headers: {
				'User-Agent': USER_AGENT,
				Referer: searchURL,
			},
		});

		if (!fetchSearch.ok) {
			throw new Error(`HTTP error! status: ${fetchSearch.status}`);
		}

		const searchResults = await fetchSearch.json();
		return searchResults?.results || [];
	} catch (error) {
		console.error(`[v${VERSION}] Error in searchMovies for keyword "${keyword}":`, error.message);
		throw error;
	}
}

export async function getMagnetLinks(topicUrl, keyword) {
	const config = await getConfig();
	const tamilMvUrl = config ? config.tamilMvUrl : '';
	console.log(`[v${VERSION}] Fetching topic:`, topicUrl);

	try {
		const topicBody = await fetch(topicUrl, {
			credentials: 'include',
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
			},
			referrer: `${tamilMvUrl}/search/?q=${keyword}`,
			method: 'GET',
			mode: 'cors',
		});

		if (!topicBody.ok) {
			throw new Error(`HTTP error! status: ${topicBody.status}`);
		}

		const forumTopic = await topicBody.text();
		const $ = cheerio.load(forumTopic);
		const releases = [];

		$('a[data-fileext="torrent"]').each((_, element) => {
			const torrentAnchor = $(element);
			const title = torrentAnchor.text().trim().replace('.torrent', '');
			const torrentPath = torrentAnchor.attr('href');

			// Find the next magnet link after this torrent link
			const magnetLink = torrentAnchor
				.parent()
				.nextAll('a[href^="magnet:"]')
				.first()
				.attr('href')
				|| torrentAnchor
					.nextAll('a[href^="magnet:"]')
					.first()
					.attr('href');

			const sizeMatch = title.match(/(\d+(?:\.\d+)?)\s*(gb|mb)/i);
			let sizeBytes = null;

			if (sizeMatch) {
				const value = Number.parseFloat(sizeMatch[1]);
				const unit = sizeMatch[2].toUpperCase();
				sizeBytes = Math.round(unit === 'GB' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024);
			}

			const publishedDateTime = $('time[datetime]').first().attr('datetime');

			if (!KEYWORDS_TO_EXCLUDE.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()))) {
				const release = {
					name: cleanTitle(title),
					torrentPath,
					guid: uuid(title, '4d1d290e-e395-4ba3-9ef4-ec90def49826'),
					magnet: magnetLink,
					publishedDate: moment(publishedDateTime)
						.utc()
						.format('ddd, DD MMM YYYY HH:mm:ss ZZ'),
					torrentSize: sizeBytes,
				};
				releases.push(release);
				console.log(`[v${VERSION}] Added release: "${release.name}"`);
			} else {
				console.log(`[v${VERSION}] Excluded release due to keyword match: "${title}"`);
			}
		});

		if (releases.length === 0) {
			console.log(`[v${VERSION}] No releases added for topic: ${topicUrl}`);
		} else {
			console.log(`[v${VERSION}] Total releases added: ${releases.length} for topic: ${topicUrl}`);
		}

		return releases;
	} catch (error) {
		console.error(`[v${VERSION}] Error fetching/parsing topic ${topicUrl}:`, error.message);
		return [];
	}
}

export async function scrapTorrents(topics, keyword, concurrencyLimit = 3) {
	const torrentCollection = [];
	const validTopics = topics.filter(t => Boolean(t.url));

	for (let i = 0; i < validTopics.length; i += concurrencyLimit) {
		const chunk = validTopics.slice(i, i + concurrencyLimit);
		// eslint-disable-next-line no-await-in-loop
		const chunkResults = await Promise.all(
			chunk.map(topic => getMagnetLinks(topic.url, keyword)),
		);
		torrentCollection.push(...chunkResults);
	}

	return torrentCollection.flat(1);
}
