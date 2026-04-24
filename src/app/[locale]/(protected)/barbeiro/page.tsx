"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BarbeiroAliasPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    router.replace(`/${locale}/dashboard`);
  }, [router, locale]);

  return null;
}
