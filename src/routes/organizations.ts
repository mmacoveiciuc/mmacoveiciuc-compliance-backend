import { Router } from "express";
import * as controller from "../controllers/organizations";
import { supabaseAuth } from "../middleware/supabaseAuth";

export const organizations = Router();

organizations.get("/", supabaseAuth, controller.getOrganizations);
organizations.get("/:org/members", supabaseAuth, controller.getUsers);
