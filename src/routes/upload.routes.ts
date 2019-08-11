import { Express, Request, Response } from "express-serve-static-core";

import { apiConfig } from './../config/api.config.interface';

import * as fs from 'fs-extra';
import * as uuidv1 from 'uuid/v1';
import { Queuing } from 'node-message-broker';
import * as Dal from 'dowpro-replay-watcher-dal';


import { isAuthenticated } from './../middleware/permissions.validation.middleware';

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

                        let result = await Dal.Business.ReadGameResultArchive(tempFolder, tempFilePath, tempFolderPath, apiConfig().gamesFilesRepositoryPath);

                        if (result.status == Dal.Types.Status.Success) {
                            // send to queue
                            await Queuing.pushTo<Dal.Types.QueuedReplay>('incoming-games', {
                                Hash: result.hash,
                                MapName: result.mapName,
                                Duration: result.duration,
                                Players: result.playersStats,
                                ModName: result.modName,
                                ModVersion: result.modVersion
                            });

                            await fs.remove(tempFolderPath);

                            res.terminate(200, "Added");
                            return;

                        } else {
                            res.terminate(400, result.errorMessage);
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
            console.log(error);
            return res.terminate(500, error);
        }
    });
}