import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats — MAX" }, { name: "description", content: "MAX stats." }, { property: "og:title", content: "Stats — MAX" }, { property: "og:description", content: "MAX stats." }] }),
  component: () => <main className="pt-safe px-safe"><h1 className="text-4xl font-extrabold">Stats</h1><p className="mt-4 text-muted-foreground">Not built yet.</p></main>,
});
