import { Express, Request, Response } from "express-serve-static-core";

import { apiConfig } from './../config/api.config.interface';

import * as fs from 'fs-extra';
import * as uuidv1 from 'uuid/v1';
import * as Dal from 'dowpro-replay-watcher-dal';
import { Queuing } from 'node-message-broker';

import { unzip, UnzipResult } from './../logic/unzipping';
import { readResult, fileHash, streamHash } from './../logic/file.system';
import { RelicChunkyParser, Types as RelicChunkyTypes } from 'relic-chunky-parser';

import { AreResultsMatching } from './../logic/validation';
import { setPlayersStats } from './../logic/ladder.logic';

import { isAuthenticated } from './../middleware/permissions.validation.middleware';
import { GameResult } from "dowpro-replay-watcher-dal/typings/exports/types.export";

export function mapUploadRoutes(app: Express) {

    app.post('/api/sendResult', isAuthenticated, async (
        req: Request,
        res: Response
    ) => {
        try {
            if (req.busboy) {
                req.busboy.on("file", async (
                    fieldName: string,
                    fileStream: NodeJS.ReadableStream,
                    fileName: string,
                    encoding: string,
                    mimeType: string
                ): Promise<void> => {

                    let tempFolder = uuidv1();
                    let tempFolderPath = `./temp/${tempFolder}`;

                    let folderExists = await fs.pathExistsSync(tempFolderPath);
                    if (folderExists) {
                        res.terminate(409, `Folder ${tempFolder} already exists`);
                        return;
                    }

                    await fs.mkdir(tempFolderPath);
                    let tempFilePath = `${tempFolderPath}/${fileName}`;
                    console.log('Uploading: ' + tempFilePath);

                    let writeStream = fs.createWriteStream(tempFilePath);
                    fileStream.pipe(writeStream);

                    writeStream.on('finish', async () => {
                        console.log('Upload complete');

                        let extraction: UnzipResult = await unzip(tempFilePath, tempFolderPath);

                        if (!extraction.result) {
                            res.terminate(400, `Unable to unzip ${tempFolder}`);
                            return;
                        }

                        let recFile = await Dal.Util.FileSystem.findRecFile(tempFolderPath);
                        if (recFile === undefined) {
                            res.terminate(400, `Unable to locate replay file for ${tempFolder}`);
                            return;
                        }

                        let hash = await fileHash(`${tempFolderPath}/${recFile}`);
                        if (hash === undefined) {
                            res.terminate(500, `Unable to compute file hash for ${tempFolder}`);
                            return;
                        } hash = <string>hash;

                        let exists = await Dal.Manipulation.GamesStore.getByHash(hash);
                        if (exists) {
                            await fs.remove(tempFolderPath);
                            res.terminate(400, `${hash}:${tempFolder} Already exists in db store`);
                            return;
                        }
                        else {
                            let gameFolderPath = `${apiConfig().gamesFilesRepositoryPath}/${hash}`;

                            let folderAlreadyExists = await fs.pathExists(gameFolderPath);
                            if (folderAlreadyExists) {
                                console.log(`Folder ${hash} already exists... Cleaning and copying uploaded files`);
                                await fs.remove(gameFolderPath);
                            }
                            await fs.mkdir(gameFolderPath);

                            await fs.move(`${tempFolderPath}/${recFile}`, `${gameFolderPath}/${recFile}`);
                            await fs.move(`${tempFolderPath}/result.json`, `${gameFolderPath}/result.json`);

                            let gameResult = await readResult(`${gameFolderPath}/result.json`);

                            if (gameResult === undefined) {
                                await fs.remove(gameFolderPath);
                                res.terminate(400, `Unable to parse game result for ${gameFolderPath}`);
                                return;
                            } gameResult = <GameResult>gameResult;

                            let parsedResult: RelicChunkyTypes.MapData;
                            try {
                                parsedResult = await RelicChunkyParser.getReplayData(`${gameFolderPath}/${recFile}`);
                            }
                            catch (err) {
                                throw err;
                            }

                            let isMatching = AreResultsMatching(gameResult, parsedResult);
                            if (!isMatching) {
                                await fs.remove(gameFolderPath);
                                res.terminate(400, `Results did not match for ${hash}`);
                                return;
                            }

                            if (gameResult.PlayersCount !== 2) {
                                await fs.remove(gameFolderPath);
                                res.terminate(400, `Invalid players count for ${hash}`);
                                return;
                            }

                            let game = {
                                Hash: hash,
                                Result: gameResult,
                                Version: '',
                                PostedToDiscord: false
                            };

                            await Dal.Manipulation.GamesStore.add(game);

                            let playersStats = await setPlayersStats(gameResult.Players[0], gameResult.Players[1]);

                            // send to queue
                            await Queuing.pushTo<Dal.Types.QueuedReplay>('incoming-games', {
                                Hash: game.Hash,
                                MapName: game.Result.MapName,
                                Duration: game.Result.Duration,
                                Version: game.Version,
                                Players: playersStats,
                                ModName: parsedResult.modName
                            });

                            await fs.remove(tempFolderPath);

                            res.terminate(200, "Added");
                            return;
                        }
                    });
                });
                //req.busboy.on('finish', () => {
                //    res.terminate(500, 'Unknown error');
                //});

                return req.pipe(req.busboy);
            } else {
                res.terminate(400, 'Invalid request (nobusboy)');
            }
        } catch (error) {
            return res.terminate(500, error);
        }
    });
}