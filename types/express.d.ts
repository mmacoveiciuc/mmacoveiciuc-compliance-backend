import "express";

declare global {
    namespace Express {
        interface Request {
            // A Supabase access token extracted from a cookie sent by the client
            token?: string;
        }
    }
}
