import { Request, Response } from "express";
import { ComplianceLineItem, ComplianceReport } from "../types";
import { SupabaseManagementAPI, isSupabaseError } from "supabase-management-js";
import { prisma } from "../database/client";

export interface User {
    user_id: string;
    user_name: string;
    email: string;
    role_name: string;
    mfa_enabled: boolean;
}

interface DatabaseBackup {
    status: string;
    is_physical_backup: boolean;
    inserted_at: string;
}

interface DatabasePhysicalBackup {
    earliest_physical_backup_date_unix: number;
    latest_physical_backup_date_unix: number;
}

interface DatabaseBackupConfig {
    region: string;
    pitr_enabled: boolean;
    walg_enabled: boolean;
    backups: DatabaseBackup[];
    physical_backup_data: DatabasePhysicalBackup;
}

interface ProjectComplianceData {
    id: string;
    name: string;
    organization_id: string;
    region: string;
}

interface TableData {
    schema_name: string;
    table_name: string;
    rls_enabled: boolean;
}

interface TableComplianceData {
    project_id: string;
    table_name: string;
    schema_name: string;
}

export type ProjectComplianceReport = ComplianceReport<ProjectComplianceData>;
export type TableComplianceReport = ComplianceReport<TableComplianceData>;
export type UserComplianceReport = ComplianceReport<User>;

export const getProjectCompliance = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });
    const orgSlug = req.params.slug;

    const report: ProjectComplianceReport = {
        lineItems: [],
        passing: true,
    };
    try {
        const projects = (await client.getProjects()).filter(
            project => project.organization_id === orgSlug,
        );
        for (const project of projects) {
            const backup = (
                await client.client.get(
                    "/v1/projects/{ref}/database/backups" as any,
                    { params: { path: { ref: project.id } } } as never,
                )
            ).data as DatabaseBackupConfig;

            const complianceData: ComplianceLineItem<ProjectComplianceData> = {
                item: {
                    id: project.id,
                    name: project.name,
                    organization_id: project.organization_id,
                    region: project.region,
                },
                breached: [],
                fix: [],
            };

            if (!backup.pitr_enabled) {
                report.passing = false;
                complianceData.breached.push({
                    name: "Point in Time Recovery (PITR)",
                    description: "PITR is disabled",
                });
            }

            report.lineItems.push(complianceData);
        }
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

    // Update the projects in the database

    for (const { item, breached } of report.lineItems) {
        const oldReport = await prisma.project.findUnique({
            where: {
                id_org: {
                    id: item.id,
                    org: item.organization_id,
                },
            },
        });
        const newReport = await prisma.project.upsert({
            where: {
                id_org: {
                    id: item.id,
                    org: item.organization_id,
                },
            },
            create: {
                id: item.id,
                org: item.organization_id,
                name: item.name,
                region: item.region,
                compliant: !breached || breached.length === 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            update: {
                name: item.name,
                compliant: !breached || breached.length === 0,
                region: item.region,
                updatedAt: new Date(),
            },
        });

        if (!oldReport) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: "{}",
                    current: JSON.stringify(newReport),
                    description: `project ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: Point In Time Recovery (PITR)`,
                    resource: "project",
                },
            });
        } else if (oldReport.compliant !== newReport.compliant) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: JSON.stringify(oldReport),
                    current: JSON.stringify(newReport),
                    description: `project ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: Point In Time Recovery (PITR)`,
                    resource: "project",
                },
            });
        }
    }

    res.json(report);
    return;
};

export const getTableCompliance = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });
    const orgSlug = req.params.slug;

    const report: TableComplianceReport = {
        lineItems: [],
        passing: true,
    };
    try {
        const projects = (await client.getProjects()).filter(
            project => project.organization_id === orgSlug,
        );
        for (const project of projects) {
            const queryResponse = (await client.runQuery(
                project.id,
                `
                SELECT
                    n.nspname AS schema_name,
                    c.relname AS table_name,
                    c.relrowsecurity AS rls_enabled
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'r'
                AND n.nspname = 'public'
                ORDER BY n.nspname, c.relname;
                `,
            )) as unknown as TableData[];

            for (const response of queryResponse) {
                const complianceData: ComplianceLineItem<TableComplianceData> =
                    {
                        item: {
                            project_id: project.id,
                            table_name: response.table_name,
                            schema_name: response.schema_name,
                        },
                        breached: [],
                        fix: [],
                    };

                if (!response.rls_enabled) {
                    report.passing = false;
                    complianceData.breached.push({
                        name: "Row Level Security (RLS)",
                        description: "RLS is disabled",
                    });
                }

                report.lineItems.push(complianceData);
            }
        }
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

    for (const { item, breached } of report.lineItems) {
        const oldReport = await prisma.table.findUnique({
            where: {
                id_org: {
                    id: item.project_id,
                    org: orgSlug,
                },
            },
        });
        const newReport = await prisma.table.upsert({
            where: {
                id_org: {
                    id: item.project_id,
                    org: orgSlug,
                },
            },
            create: {
                id: item.project_id,
                org: orgSlug,
                name: item.table_name,
                schema: item.schema_name,
                compliant: !breached || breached.length == 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            update: {
                name: item.table_name,
                schema: item.schema_name,
                compliant: !breached || breached.length == 0,
                updatedAt: new Date(),
            },
        });

        if (!oldReport) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: "{}",
                    current: JSON.stringify(newReport),
                    description: `table ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: Row Level Security (RLS)`,
                    resource: "table",
                },
            });
        } else if (oldReport.compliant !== newReport.compliant) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: JSON.stringify(oldReport),
                    current: JSON.stringify(newReport),
                    description: `table ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: Row Level Security (RLS)`,
                    resource: "table",
                },
            });
        }
    }

    res.json(report);
    return;
};

export const getUsersCompliance = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });
    const orgSlug = req.params.slug;

    let users;
    try {
        users = (
            await client.client.get("/v1/organizations/{slug}/members", {
                params: { path: { slug: orgSlug } },
                body: undefined as never,
            })
        ).data as User[];
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

    const report: ComplianceReport<User> = {
        lineItems: [],
        passing: true,
    };
    for (const user of users) {
        const complianceData: ComplianceLineItem<User> = {
            item: {
                ...user,
            },
            breached: [],
            fix: [],
        };

        if (!user.mfa_enabled) {
            report.passing = false;
            complianceData.breached.push({
                name: "Multi-Factor Authentication",
                description: "MFA is disabled",
            });
        }

        report.lineItems.push(complianceData);
    }

    for (const { item, breached } of report.lineItems) {
        const oldReport = await prisma.user.findUnique({
            where: {
                id_org: {
                    id: item.user_id,
                    org: orgSlug,
                },
            },
        });
        const newReport = await prisma.user.upsert({
            where: {
                id_org: {
                    id: item.user_id,
                    org: orgSlug,
                },
            },
            create: {
                id: item.user_id,
                org: orgSlug,
                name: item.user_name,
                role: item.role_name,
                email: item.email,
                compliant: !breached || breached.length === 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            update: {
                name: item.user_name,
                role: item.role_name,
                email: item.email,
                compliant: !breached || breached.length === 0,
                updatedAt: new Date(),
            },
        });

        if (!oldReport) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: "{}",
                    current: JSON.stringify(newReport),
                    description: `user ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: MFA`,
                    resource: "user",
                },
            });
        } else if (oldReport.compliant !== newReport.compliant) {
            await prisma.complianceLog.create({
                data: {
                    org: orgSlug,
                    previous: JSON.stringify(oldReport),
                    current: JSON.stringify(newReport),
                    description: `user ${
                        newReport.compliant ? "passed" : "failed"
                    } compliance checks: MFA`,
                    resource: "user",
                },
            });
        }
    }

    res.json(report);
};

export const getComplianceLogs = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const client = new SupabaseManagementAPI({ accessToken: req.token });
    const orgSlug = req.params.slug;
    const resource = String(req.query.resource);

    const orgs = await client.getOrganizations();
    const requestedOrg = orgs.find(org => org.id === orgSlug);

    if (!requestedOrg) {
        res.status(401).json({
            error: "unauthorized access to compliance log",
            message:
                "cannot request compliance logs for orgs you are not apart of",
        });
        return;
    }

    const logs = await prisma.complianceLog.findMany({
        where: {
            resource,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    res.json(logs);
};
