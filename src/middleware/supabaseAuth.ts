import { Request, Response, NextFunction } from "express";

export const supabaseAuth = (
    req: Request,
    res: Response,
    next: NextFunction,
): any => {
    const { access_token } = req.cookies;

    if (!access_token) {
        return res.status(401).json({ error: "missing supabase auth token" });
    }

    req.token = access_token;
    next();
};
