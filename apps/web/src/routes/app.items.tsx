import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/items')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/items"!</div>
}
