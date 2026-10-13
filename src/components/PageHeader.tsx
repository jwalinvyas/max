import { Link } from "@tanstack/react-router";
import { Settings2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ label, title, settings = false, back = false }: { label: string; title: string; settings?: boolean; back?: boolean }) {
  return (
    <header className="page-header">
      <div className="mb-7 flex items-center justify-between">
        <Link to="/" className="wordmark" aria-label="MAX home">MAX<span className="text-muted-foreground">.</span></Link>
        {settings && <Button asChild variant="outline" size="icon" className="tap rounded-lg"><Link to="/settings" aria-label="Settings" title="Settings"><Settings2 /></Link></Button>}
        {back && <Button asChild variant="outline" size="icon" className="tap rounded-lg"><Link to="/" aria-label="Back to today" title="Back to today"><ArrowLeft /></Link></Button>}
      </div>
      <p className="eyebrow mb-2">{label}</p>
      <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
    </header>
  );
}