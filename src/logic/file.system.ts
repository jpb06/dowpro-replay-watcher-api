import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import { Types } from 'dowpro-replay-watcher-dal';

export async function readResult(
    filePath: string
): Promise<Types.GameResult | undefined> {

    let raw: any = await fs.readJSON(filePath);

    if (Types.validateGameResult(raw))
        return raw as Types.GameResult;

    return undefined;
}

export async function fileHash(
    filePath: string,
    algorithm = 'sha256'
): Promise<string | undefined> {

    return new Promise<string>(async (resolve, reject) => {
        let shasum = crypto.createHash(algorithm);
        try {
            let stream = fs.createReadStream(filePath);
            stream.on('data', (data) => {
                shasum.update(data);
            })
            // making digest
            stream.on('end', () => {
                const hash = shasum.digest('hex');
                return resolve(hash);
            })
        } catch (error) {
            return reject(undefined);
        }
    });
}

export async function streamHash(
    stream: NodeJS.ReadableStream,
    algorithm = 'sha256'
): Promise<string | undefined> {

    return new Promise<string>((resolve, reject) => {
        // Algorithm depends on availability of OpenSSL on platform
        // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
        let shasum = crypto.createHash(algorithm);
        try {
            stream.on('data', (data) => {
                shasum.update(data);
            })
            // making digest
            stream.on('end', () => {
                const hash = shasum.digest('hex');
                return resolve(hash);
            })
        } catch (error) {
            return reject(undefined);
        }
    });
}