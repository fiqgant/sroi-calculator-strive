"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("sroi_auth");
    if (isAuth === "true") {
      router.replace("/calculator");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
