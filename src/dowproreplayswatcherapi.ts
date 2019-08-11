import * as debug from 'debug';
import * as express from 'express';
import * as busboy from 'connect-busboy';
import { Express, Response } from "express-serve-static-core";
import * as bodyParser from "body-parser"; // pull information from HTML POST (express4)
import * as cors from 'cors';

import { mapUploadRoutes } from './routes/upload.routes';
import { mapSecurityRoutes } from './routes/security.routes.js';
import { extendsImplementation } from './middleware/extends.implementation.middleware';

import { apiConfig } from './config/api.config.interface';

import { Configuration as MessageBrokerConfiguration } from 'node-message-broker';
import { Configuration as DalConfiguration } from 'dowpro-replay-watcher-dal';
import { Configuration as RsaStoreConfiguration } from 'rsa-vault';

MessageBrokerConfiguration.Setup(apiConfig());
DalConfiguration.Setup(apiConfig());
RsaStoreConfiguration.Setup(apiConfig());

let app: Express = express();
app.use(busboy());
app.use(cors({
    origin: (apiConfig()).srvURLs,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(extendsImplementation);

app.get('/', (req, res) => {
    res.send('Valid routes are in /api');
});
app.get('/api/', (req, res) => {
    res.send('Dowpro replays watcher API.');
});
mapUploadRoutes(app);
mapSecurityRoutes(app);

app.set('port', 3001);

var server = app.listen(app.get('port'), apiConfig().expressListeningIPAddress, function () {
    debug('Express server listening on port ' + server.address().port);
});