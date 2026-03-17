import * as Sentry from "@sentry/react";

import { router } from "./router";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const tracePropagationTargets =
	typeof window === "undefined"
		? ["localhost"]
		: ["localhost", window.location.origin];

if (dsn) {
	Sentry.init({
		dsn,
		environment: import.meta.env.MODE,
		sendDefaultPii: true,
		integrations: [
			Sentry.tanstackRouterBrowserTracingIntegration(router),
			Sentry.replayIntegration({
				maskAllText: true,
				blockAllMedia: true,
			}),
		],
		tracesSampleRate: import.meta.env.DEV ? 1 : 0.2,
		tracePropagationTargets,
		replaysSessionSampleRate: import.meta.env.DEV ? 1 : 0.1,
		replaysOnErrorSampleRate: 1,
		debug: import.meta.env.DEV,
	});

	// 	if (import.meta.env.DEV) {
	// 		console.info("[Sentry] initialized", {
	// 			dsn,
	// 			environment: import.meta.env.MODE,
	// 		});
	// 	}
	// } else if (import.meta.env.DEV) {
	// 	console.warn(
	// 		"[Sentry] disabled: VITE_SENTRY_DSN is missing. Restart the dev server after adding it to .env.",
	// 	);
}
