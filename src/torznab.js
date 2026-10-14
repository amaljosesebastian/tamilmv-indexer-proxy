export async function createRssFeed(baseUrl, magnetInfo, request) {
	const feedObject = {
		rss: [
			{
				_attr: {
					version: '2.0',
					'xmlns:atom': 'http://www.w3.org/2005/Atom',
					'xmlns:torznab': 'http://torznab.com/schemas/2015/feed',
				},
			},
			{
				channel: [
					{
						'atom:link': {
							_attr: {
								href: baseUrl,
								rel: 'self',
								type: 'application/rss+xml',
							},
						},
					},
					{
						title: 'TamilMV RSS',
					},
					{
						link: baseUrl,
					},
					{description: 'TamilMV RSS Generator Developed By Febin Baiju'},
					{
						'torznab:response': {
							_attr: {
								offset: request.offset >= 50 ? 0 : 0,
								total: request.offset >= 50 ? 0 : 1,
							},
						},
					},
					request?.offset < 50
						? {
							language: 'en-US',
						}
						: {},
					request?.offset < 50
						? {
							category: 2000,
						}
						: {},
					...((request?.offset || 0) < 50
						? magnetInfo.map(post => {
							const feedItem = {
								item: [
									{title: post.name},
									{
										description: {
											_cdata: post.name,
										},
									},
									{
										link: post.torrentPath,
									},
									{
										guid: post.guid,
									},
									{
										pubDate: post.publishedDate,
									},
									{
										enclosure: {
											_attr: {
												url: post.torrentPath,
												type: 'application/x-bittorrent',
												length: '10000',
											},
										},
									},
									{comments: post.name},
									{'torznab:attr': {_attr: {name: 'magneturl', value: post.magnet}}},
									{
										'torznab:attr': {_attr: {name: 'seeders', value: 10}},
									},
									{
										'torznab:attr': {
											_attr: {name: 'leechers', value: 10},
										},
									},
									{
										'torznab:attr': {
											_attr: {name: 'size', value: post.torrentSize},
										},
									},
								],
							};
							return feedItem;
						})
						: {}),
				],
			},
		],
	};
	return feedObject;
}

export async function torznabTest() {
	const xmlString = {
		caps: [
			{
				server: {
					_attr: {
						version: '1.0',
						title: 'TamilMV Torznab',
						image: 'https://download.epson-europe.com/logo/true_epsonlogo.jpg',
					},
				},
			},
			{limits: {_attr: {max: '100', default: 50}}},
			{registration: {_attr: {available: 'no', open: 'no'}}},
			{
				searching: [
					{search: {_attr: {available: 'yes'}}},
					{
						'movie-search': {
							_attr: {available: 'yes', supportedParams: 'q'},
						},
					},
				],
			},
			{categories: []},
		],
	};

	const categoriesObject = xmlString.caps.find(item => 'categories' in item);
	const categoriesXml = categoriesObject ? categoriesObject.categories : [];

	for (const category of [
		{
			pid: 0,
			id: 2000,
			name: 'Movies',
		},
	]) {
		if (category.pid === 0) {
			categoriesXml.push({
				category: [{_attr: {id: category.id, name: category.name}}],
			});
		} else {
			const parentCat = categoriesXml.find(object =>
				object.category && object.category.some(objc =>
					objc._attr !== undefined && objc._attr.id === category.pid,
				),
			);
			if (parentCat) {
				parentCat.category.push({
					subcat: [{_attr: {id: category.id, name: category.name}}],
				});
			}
		}
	}

	return xmlString;
}

export async function noTopics(baseUrl) {
	const feedObject = {
		rss: [
			{
				_attr: {
					version: '2.0',
					'xmlns:atom': 'http://www.w3.org/2005/Atom',
					'xmlns:torznab': 'http://torznab.com/schemas/2015/feed',
				},
			},
			{
				channel: [
					{
						'atom:link': {
							_attr: {
								href: baseUrl,
								rel: 'self',
								type: 'application/rss+xml',
							},
						},
					},
					{
						title: 'TamilMV RSS',
					},
					{
						link: baseUrl,
					},
					{description: 'TamilMV RSS Generator Developed By Febin Baiju'},
					{
						'torznab:response': {
							_attr: {
								offset: 0,
								total: 0,
							},
						},
					},
				],
			},
		],
	};
	return feedObject;
}
