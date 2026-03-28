import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] h-full w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-white animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-3 tracking-tight">Page Not Found</h1>

      <p className="text-lg text-muted-foreground mb-8 text-center max-w-[400px]">
        This page does not exist or is still work in progress.
      </p>

      <Link href="/launcher" className="w-full sm:w-auto">
        <Button className="w-full sm:w-auto rounded-app h-12 px-8 bg-white/10 hover:bg-white/20 text-white transition-all">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Launcher
        </Button>
      </Link>
    </div>
  );
}
