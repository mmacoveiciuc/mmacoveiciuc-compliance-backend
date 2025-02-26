import { Router } from "express";
import * as controller from "../controllers/projects";
import { supabaseAuth } from "../middleware/supabaseAuth";

export const projects = Router();

projects.get("/", supabaseAuth, controller.getProjects);
projects.get(
    "/:ref/database/backups",
    supabaseAuth,
    controller.getProjectBackups,
);
projects.post("/:ref/database/query", supabaseAuth, controller.runSQLQuery);
projects.post(
    "/:ref/database/query/enable_rls",
    supabaseAuth,
    controller.enableRLS,
);
