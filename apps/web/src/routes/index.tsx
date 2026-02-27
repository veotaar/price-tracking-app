import { createFileRoute } from "@tanstack/react-router";
import { Example, ExampleWrapper } from "@web/components/example";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return (
		<div className="p-2">
			<ExampleWrapper>
				<Example title="Shadcnui example">
					<p>
						Shadcnui + TanStack Router + Vite working ✅
						<br />
						<br />
					</p>
				</Example>
			</ExampleWrapper>
		</div>
	);
}
