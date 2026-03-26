"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface ServiceBookingButtonProps {
  bookingHref: string;
  isExternal: boolean;
  label: string;
  className?: string;
}

export function ServiceBookingButton({
  bookingHref,
  isExternal,
  label,
  className,
}: ServiceBookingButtonProps) {
  const linkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Button
      className={`w-full cursor-pointer ${className ?? ""}`}
      variant="default"
      asChild
    >
      <Link
        href={bookingHref}
        className="flex items-center justify-center"
        {...linkProps}
      >
        <Calendar className="h-4 w-4 mr-2" />
        {label}
      </Link>
    </Button>
  );
}
