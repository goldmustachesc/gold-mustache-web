"use client";

import { Check, Share2 } from "lucide-react";
import { useCallback, useState } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard access denied
      }
    }
  }, [title, url]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
      aria-label="Share"
    >
      {copied ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : (
        <Share2 className="h-5 w-5" />
      )}
    </button>
  );
}
