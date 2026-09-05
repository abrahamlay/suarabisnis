import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SignupForm from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect(`/app/${session.tenantSlug}`);
  }
  return <SignupForm />;
}