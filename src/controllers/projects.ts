import { Request, Response } from "express";
import { prisma } from "../database/client";
import { SupabaseManagementAPI, isSupabaseError } from "supabase-management-js";

export const getProjects = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    let projects;
    try {
        projects = await client.getProjects();
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

    res.json(projects);
};

export const getProjectBackups = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    const ref = req.params.ref;
    if (!ref || typeof ref !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "ref not provided",
        });
        return;
    }

    let backups;
    try {
        backups = await client.client.get(
            "/v1/projects/{ref}/database/backups" as any,
            { params: { path: { ref } } } as never,
        );
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

    res.json(backups);
};

export const runSQLQuery = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    const ref = req.params.ref;
    if (!ref || typeof ref !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "ref not provided",
        });
        return;
    }

    const query = req?.body?.query;
    if (!query || !(typeof query === "string")) {
        res.status(400).json({
            error: "bad request",
            message: "query not provided",
        });
        return;
    }

    let queryResponse;
    try {
        queryResponse = await client.runQuery(ref, query);
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

    res.json(queryResponse);
};

export const enableRLS = async (req: Request, res: Response): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });

    const ref = req.params.ref;
    if (!ref || typeof ref !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "project id not provided",
        });
        return;
    }

    const tableName = req.body.table;
    const schema = req.body.schema;
    const org = req.body.org;

    if (!tableName || typeof tableName !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "table name not provided",
        });
        return;
    }
    if (!schema || typeof schema !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "schema name not provided",
        });
        return;
    }
    if (!org || typeof org !== "string") {
        res.status(400).json({
            error: "bad request",
            message: "org id was not provided",
        });
        return;
    }

    let queryResponse;
    try {
        queryResponse = await client.runQuery(
            ref,
            `ALTER TABLE ${schema}."${tableName}" ENABLE ROW LEVEL SECURITY;`,
        );
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

    await prisma.complianceLog.create({
        data: {
            org: org,
            current: JSON.stringify({ name: tableName }),
            previous: JSON.stringify({ name: tableName }),
            description: "Enabled RLS via SQL query",
            resource: "table",
        },
    });

    res.status(200).send();
    return;
};
