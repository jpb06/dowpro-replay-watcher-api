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

import { Configuration as MessageBrokerConfiguration, Queuing } from 'node-message-broker';
import { Configuration as DalConfiguration, Types } from 'dowpro-replay-watcher-dal';
import { Configuration as RsaStoreConfiguration } from 'rsa-vault';

MessageBrokerConfiguration.Setup(apiConfig());
DalConfiguration.Setup(apiConfig());
RsaStoreConfiguration.Setup(apiConfig());

//import * as fs from 'fs-extra';
//(async () => {
//    console.log('dir', __dirname);
//    console.log('cwd', process.cwd());
//    let a;
//    try {
//        a = await fs.readFile('./../dowpro-replays/8e47a9977242ba38936836f6dbe8990b021d2a80274de13e779331b5151a21d3/result.json');
//    } catch (err) {
//        throw err;
//    }
//    console.log('a', a);
//})();


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

//(async () => {
//    await Queuing.popFrom('incoming-games', (c: Types.Game) => console.log('c', c));

    //await Queuing.pushTo('incoming-games', {
    //    Hash: 'yolo',
    //    Result: {
    //        PlayersCount: 2,
    //        WinCondition: 'Anihilate',
    //        TeamsCount: 2,
    //        Duration: 504,
    //        MapName: 'Antiga bay',
    //        Players: [
    //            {
    //                Race: 'ork',
    //                IsHuman: true,
    //                IsAmongWinners: false,
    //                Team: 1,
    //                Name: 'something',
    //                PTtlSc: 5645
    //            },
    //            {
    //                Race: 'sm',
    //                IsHuman: true,
    //                IsAmongWinners: true,
    //                Team: 2,
    //                Name: 'yao',
    //                PTtlSc: 508
    //            }
    //        ]
    //    },
    //    Version: '3.66',
    //    PostedToDiscord: false,
    //});
//})();