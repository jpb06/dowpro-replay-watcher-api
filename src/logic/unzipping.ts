import * as fs from 'fs-extra';
import * as yauzl from 'yauzl';
import { Readable } from "stream";

export interface UnzipResult {
    result: boolean;
    error: string;
}

export async function unzip(
    zipFilePath: string,
    destPath: string
): Promise<UnzipResult> {

    return new Promise<UnzipResult>((resolve, reject) => {

        yauzl.open(zipFilePath, { lazyEntries: true }, (err?: Error, zipfile?: yauzl.ZipFile) => {

            if (err) throw err;
            if (!zipfile) reject({ result: false, error: "No zip file" });
            else {
                zipfile.readEntry();

                zipfile.on('entry', (entry: yauzl.Entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        // Directory file names end with '/'.
                        zipfile.readEntry();
                    } else {
                        // file entry
                        zipfile.openReadStream(entry, (err?: Error, readStream?: Readable) => {
                            if (err) throw err;
                            if (!readStream) reject({ result: false, error: `No read stream for ${entry.fileName}` });
                            else {
                                readStream.on("end", function () {
                                    zipfile.readEntry();
                                });
                                var myFile = fs.createWriteStream(`${destPath}/${entry.fileName}`);
                                readStream.pipe(myFile);
                            }
                        });
                    }

                    zipfile.readEntry();

                });
                //zipfile.on('end', () => {
                //    console.log('end of unzip');
                //});
                zipfile.once('close', () => {
                    resolve({ result: true, error: '' });
                });
            }
        });
    });
}