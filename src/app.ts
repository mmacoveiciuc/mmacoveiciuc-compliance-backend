import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import { organizations } from "./routes/organizations";
import { projects } from "./routes/projects";
import { compliance } from "./routes/compliance";

export const app = express();

app.use(
    cors({
        origin: process.env.CORS_HOST ?? "http://localhost:3000", // Explicitly allow frontend origin
        credentials: true, // Allow cookies to be sent
    }),
);
app.use(cookieParser());
app.use(express.json());

// Express configuration
app.set("port", process.env.PORT || 8080);

app.use("/v1/organizations", organizations);
app.use("/v1/projects", projects);
app.use("/v1/compliance", compliance);
