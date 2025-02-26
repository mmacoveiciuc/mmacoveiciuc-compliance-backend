import { Request, Response } from "express";
import { SupabaseManagementAPI, isSupabaseError } from "supabase-management-js";

export const getOrganizations = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    let organizations;
    try {
        organizations = await client.getOrganizations();
    } catch (err) {
        if (isSupabaseError(err)) {
            res.status(err.response.status).json({
                error: err.name,
                message: err.message,
            });
        } else {
            res.status(500).json({
                error: "unknown internal error",
                message: String(err),
            });
        }
        return;
    }

    res.json(organizations);
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    const orgSlug = req.params.org;
    if (!orgSlug || typeof orgSlug !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "org slug missing from request",
        });
        return;
    }

    let users;
    try {
        users = await client.client.get("/v1/organizations/{slug}/members", {
            params: { path: { slug: orgSlug } },
            body: undefined as never,
        });
    } catch (err) {
        if (isSupabaseError(err)) {
            res.status(err.response.status).json({
                error: err.name,
                message: err.message,
            });
        } else {
            res.status(500).json({
                error: "unknown internal error",
                message: String(err),
            });
        }
        return;
    }

    res.json(users.data);
};
