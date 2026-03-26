"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { initDeepLinkListener } from "@/services/deep-link";
import { useEffect, useState } from "react";

export default function DeepLinkListener() {
  const [testOpen, setTestOpen] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    (async () => {
      dispose = await initDeepLinkListener(({ url, parsed, source }) => {
        // Debug logging only; routing will be added later.
        console.log("[deep-link] received", { source, url, parsed });

        // Test hook: open a simple modal on relaydrive(-dev)://callback?test
        if (parsed.path === "callback" && Object.prototype.hasOwnProperty.call(parsed.query, "test")) {
          setLastUrl(url);
          setTestOpen(true);
        }
      });
    })();
    return () => {
      try {
        dispose?.();
      } catch {}
    };
  }, []);

  return (
    <Dialog open={testOpen} onOpenChange={setTestOpen}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Deep link test</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          {lastUrl ? (
            <>
              <p className="mb-2">We received a deep link:</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{lastUrl}</code>
            </>
          ) : (
            <p>We received a deep link test signal.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setTestOpen(false)}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
