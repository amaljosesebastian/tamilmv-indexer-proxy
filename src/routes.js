import express from 'express';
import xml from 'xml';
import {XMLBuilder, XMLParser} from 'fast-xml-parser';
import {getConfig, updateConfig} from './db.js';
import {GLOBAL_SETTINGS, VERSION} from './config.js';
import {
	searchMovies,
	scrapTorrents,
	hasNonEnglishCharacters,
} from './scraper.js';
import {createRssFeed, torznabTest, noTopics} from './torznab.js';
import {
	getSearchTerms,
	matchesAllTerms,
	buildSearchCandidates,
} from './search.js';

const router = new express.Router();

// Try each search in order. Prefer results whose titles contain every important word.
const searchWithFallback = async (candidates, terms) => {
	let fallback = [];
	for (const candidate of candidates) {
		// eslint-disable-next-line no-await-in-loop
		const results = await searchMovies(candidate);
		const matched = results.filter(result => matchesAllTerms(result.title, terms));
		if (matched.length > 0) {
			return matched;
		}

		if (fallback.length === 0) {
			fallback = results;
		}
	}

	return fallback;
};

const slugify = s => {
	const base = String(s || '')
		.toLowerCase()
		.replace(/[^a-z\d\s-]+/g, ' ')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, 80);
	return base || 't';
};

const getTopicUrl = (tid, title, tamilMvUrl) => `${tamilMvUrl}/index.php?/topic/${tid}-${slugify(title)}/`;

// GET / - Manager Settings Page
router.get('/', async (request, response, next) => {
	try {
		const loadSettings = await getConfig();
		if (!loadSettings) {
			return response.status(500).send('Database configuration not loaded.');
		}

		const settings = {
			...loadSettings,
			customSearch: Boolean(loadSettings.custom_search),
			customSearchOn: Boolean(loadSettings.custom_search),
			customSearchOff: !loadSettings.custom_search,
		};
		const tryUrl = `${loadSettings.tamilMvUrl}/search/?q=${encodeURIComponent(
			loadSettings.custom_search_keyword,
		)}`;

		response.render('index', {...GLOBAL_SETTINGS, tryUrl, ...settings});
	} catch (error) {
		next(error);
	}
});

// POST / - Update Settings
router.post('/', async (request, response, next) => {
	try {
		const previousConfig = await getConfig();
		if (!previousConfig) {
			return response.status(500).send('Database configuration not loaded.');
		}

		const updateSettings = await updateConfig({
			tamilmvUrl: request.body.tamilmv_url || previousConfig.tamilmv_url,
			customSearch: request.body.custom_search_toggle === '1',
			customSearchKeyword:
        request.body.custom_search || previousConfig.custom_search_keyword,
		});

		const loadSettings = await getConfig();
		const settings = {
			...loadSettings,
			customSearch: Boolean(loadSettings.custom_search),
			customSearchOn: Boolean(loadSettings.custom_search),
			customSearchOff: !loadSettings.custom_search,
			...(updateSettings
				? {
					savedMessage: 'Settings Saved!',
				}
				: null),
		};
		const tryUrl = `${loadSettings.tamilMvUrl}/search/?q=${encodeURIComponent(
			loadSettings.custom_search_keyword,
		)}`;

		response.render('index', {...GLOBAL_SETTINGS, tryUrl, ...settings});
	} catch (error) {
		next(error);
	}
});

// GET /api - Torznab Proxy RSS endpoint
router.get('/api', async (request, response) => {
	let config;
	try {
		config = await getConfig();
	} catch (dbError) {
		console.error('Failed to read database configuration:', dbError.message);
		return response.status(500).json({
			message: 'Database connection failed',
			status: 'FAILED',
		});
	}

	const {tamilMvUrl, ...configs} = config;
	console.log(`[v${VERSION}] query`, request.query);
	const baseUrl = request.protocol + '://' + request.get('host');
	const testMode = request.query.t === 'caps';

	// Treat curly apostrophes like normal ones so "It\u2019s" is not seen as non-English
	const rawQuery = String(request.query.q || '').replace(/[\u2018\u2019\u00B4`]/g, '\'');
	const useCustom = !testMode && Boolean(configs.custom_search);
	const terms = useCustom ? [] : getSearchTerms(rawQuery);
	const candidates = buildSearchCandidates(
		terms,
		useCustom ? configs.custom_search_keyword : '',
	);
	const keyword = candidates[0];
	console.log(`[v${VERSION}] Terms:`, terms, 'Searches:', candidates);

	let rssFeed;
	try {
		if (!testMode && hasNonEnglishCharacters(rawQuery)) {
			console.log(`[v${VERSION}] Skipping searchMovies because non-English characters are detected in the query...`);
			rssFeed = await noTopics(baseUrl);
		} else {
			const searchResults = await searchWithFallback(candidates, terms);
			try {
				if (testMode) {
					rssFeed = await torznabTest();
				} else if (request.query.offset >= 50) {
					rssFeed = await noTopics(baseUrl);
				} else {
					const topics = searchResults
						.map(result => ({
							url: getTopicUrl(result.tid, result.title, tamilMvUrl),
							title: result.title,
						}));

					if (topics.length > 0) {
						const magnetInfo = await scrapTorrents(topics, keyword);
						rssFeed = magnetInfo.length > 0
							? await createRssFeed(baseUrl, magnetInfo, request.query)
							: await noTopics(baseUrl);
					} else {
						rssFeed = await noTopics(baseUrl);
					}
				}
			} catch (scrapError) {
				console.error('Error fetching topics / scraping torrents:', scrapError.message);
				return response.status(529).json({
					message: 'Could not get topics',
					status: 'FAILED',
				});
			}
		}
	} catch (searchError) {
		console.error(`Error connecting to search API at ${tamilMvUrl}:`, searchError.message);
		return response.status(521).json({
			message: `Could not connect to the server ${tamilMvUrl}`,
			status: 'FAILED',
		});
	}

	const parser = new XMLParser({
		ignoreAttributes: false,
		preserveOrder: true,
		cdataPropName: '__cdata',
	});

	const feed = `<?xml version="1.0" encoding="UTF-8" ?>${xml(rssFeed)}`;
	const builder = new XMLBuilder({
		ignoreAttributes: false,
		preserveOrder: true,
		cdataPropName: '__cdata',
		format: true,
	});
	const xmlContent = builder.build(parser.parse(feed));

	response.contentType('Content-Type', 'text/xml');
	return response.send(xmlContent);
});

export default router;