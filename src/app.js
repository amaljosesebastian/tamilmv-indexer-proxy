import express from 'express';
import cors from 'cors';
import nocache from 'nocache';
import bodyParser from 'body-parser';
import router from './routes.js';

const app = express();

app.use(cors());
app.use(nocache());
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);

app.set('view engine', 'pug');
app.set('views', './views');
app.locals.cache = false;

// Mount application routes
app.use('/', router);

export default app;
