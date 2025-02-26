import { Router } from "express";
import * as controller from "../controllers/compliance";
import { supabaseAuth } from "../middleware/supabaseAuth";

export const compliance = Router();

compliance.get("/:slug/logs", supabaseAuth, controller.getComplianceLogs);
compliance.get(
    "/:slug/projects",
    supabaseAuth,
    controller.getProjectCompliance,
);
compliance.get("/:slug/tables", supabaseAuth, controller.getTableCompliance);
compliance.get("/:slug/users", supabaseAuth, controller.getUsersCompliance);
