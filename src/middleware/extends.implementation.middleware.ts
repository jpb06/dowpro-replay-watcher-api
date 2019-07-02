import { Request, Response, NextFunction } from 'express';

export function extendsImplementation(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // ----------------------------------------------------------------------------------------------
    // Request extends
    // ----------------------------------------------------------------------------------------------
    req.validateLogin = function (): boolean {
        if ((req.body.login === undefined || req.body.login === '') ||
            (req.body.password === undefined || req.body.password === '')) {
            return false;
        }

        return true;
    }
    // ----------------------------------------------------------------------------------------------
    // Response extends
    // ----------------------------------------------------------------------------------------------
    res.populate = function (data: any): Response {
        if (data === undefined) {
            return res.status(404).json({
                status: 404,
                data: null
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: data
            });
        }
    }
    res.answer = function (
        status: number,
        message: string
    ): Response {
        console.log(message);
        return res.status(status).json({
            status: status,
            message: message
        });
    }
    res.terminate = function (
        status: number,
        message: string
    ): void {
        console.log(message);
        res.writeHead(status, { 'Connection': 'close' });
        res.end(message);
    }

    next();
}