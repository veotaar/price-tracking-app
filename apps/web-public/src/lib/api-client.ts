import type { AppPublic } from "@api-public/index";
import { treaty } from "@elysiajs/eden";

const apiBaseUrl =
	typeof window === "undefined"
		? "http://localhost:3001"
		: window.location.origin;

export const publicClient = treaty<AppPublic>(apiBaseUrl);

export const client = publicClient;
