import * as jwt from 'jsonwebtoken';
import { Types, VaultService } from 'rsa-vault';
import { Request, Response, NextFunction } from 'express';

function verifyHeaders(
    req: Request,
    res: Response
): string {
    let authorizationHeaders = req.headers.authorization || '';
    let chunks = authorizationHeaders.split(' ');

    if (chunks.length === 0 || chunks[0] !== 'Bearer' || chunks[1].length === 0) {
        return '';
    }

    return chunks[1];
}

export async function isAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        let token = verifyHeaders(req, res);
        if (token === '') {
            return res.answer(401, 'Not logged in');
        }

        let keyPair: Types.ApplicationKeys = await VaultService.GetKeyPair('dowpro-ladder');

        let result = jwt.verify(token, keyPair.publicKey);
        res.locals.login = (<any>result).guild;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.answer(401, 'Token has expired');
        } else if (error.name === 'JsonWebTokenError' && error.message.startsWith('jwt subject invalid')) {
            return res.answer(401, 'Invalid token');
        } else {
            return res.answer(500, error.message);
        }
    }
};