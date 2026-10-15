// Helpers that turn the text Prowlarr/Radarr sends into good TamilMV search terms.

const STOP_WORDS = new Set([
	'a', 'an', 'the', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'it', 'its', 'is', 'vs',
]);

// Lowercase, drop apostrophes (it's -> its), turn other punctuation into spaces
export const normalizeText = value => String(value || '')
	.toLowerCase()
	.replace(/[\u2018\u2019\u00B4`']/g, '')
	.replace(/[^a-z\d\s]+/g, ' ')
	.replace(/\s+/g, ' ')
	.trim();

// "It's A Medical Miracle 2026" -> ['medical', 'miracle']
export const getSearchTerms = query => {
	const words = normalizeText(query).split(' ').filter(Boolean);
	const withoutYears = words.filter(word => !/^(19|20)\d{2}$/.test(word));
	const base = withoutYears.length > 0 ? withoutYears : words;
	const significant = base.filter(word => !STOP_WORDS.has(word));
	return significant.length > 0 ? significant : base;
};

// Every important word must appear in the result title
export const matchesAllTerms = (title, terms) => {
	const text = normalizeText(title);
	return terms.every(term => text.includes(term));
};

// Searches to try, in order: first two important words, then the first word
export const buildSearchCandidates = (terms, customKeyword) => {
	if (customKeyword) {
		return [encodeURIComponent(customKeyword)];
	}

	if (terms.length === 0) {
		return [encodeURIComponent('drishyam 4')];
	}

	const candidates = [];
	if (terms.length > 1) {
		candidates.push(terms.slice(0, 2).join(' '));
	}

	candidates.push(terms[0]);
	return candidates.map(candidate => encodeURIComponent(candidate));
};