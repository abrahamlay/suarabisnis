import { Suspense } from "react";
import MockCheckoutClient from "./checkout-client";

export default function MockCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Memuat...
        </div>
      }
    >
      <MockCheckoutClient />
    </Suspense>
  );
}