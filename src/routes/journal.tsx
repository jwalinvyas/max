import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Journal — MAX" }, { name: "description", content: "MAX journal." }, { property: "og:title", content: "Journal — MAX" }, { property: "og:description", content: "MAX journal." }] }),
  component: () => <main className="pt-safe px-safe"><h1 className="text-4xl font-extrabold">Journal</h1><p className="mt-4 text-muted-foreground">Not built yet.</p></main>,
});
