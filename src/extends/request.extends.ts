declare namespace Express {
    export interface Request {
        validateLogin: () => boolean;
    }
}