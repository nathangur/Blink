import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_api/login")({
	beforeLoad: async ({ context, location }) => {
		if (location.pathname === "/login") {
			const api = context.api;
			console.log(api);
			const publicUsers = (await getUserApi(api).getPublicUsers()).data;
			if (publicUsers.length > 0) {
				throw redirect({ to: "/login/list" });
			}
			throw redirect({ to: "/login/manual" });
		}
	},
});