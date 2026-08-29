import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  // Server-side redirect avoids a client hydration race where "/" renders
  // then immediately navigates to "/overview" while auth may still be settling.
  throw redirect("/overview");
}

export default function Home() {
  return null;
}
