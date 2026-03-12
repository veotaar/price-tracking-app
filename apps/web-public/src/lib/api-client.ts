import type { AppPublic } from "@api-public/index";
import { treaty } from "@elysiajs/eden";

export const publicClient = treaty<AppPublic>("http://localhost:3001/");
