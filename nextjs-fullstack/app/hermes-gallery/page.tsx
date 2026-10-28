import { notFound } from "next/navigation";
import { Gallery } from "./gallery";
import { isMode, isStyleId } from "./styles";
import "./styles.css";

// Read APP_ENV on every request: a published app runs the same build with APP_ENV=production.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

/** Preview-only page that shows every starter component in one design style and mode. */
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.APP_ENV?.trim().toLowerCase() === "production") notFound();
  const params = await searchParams;
  const style = isStyleId(params.style) ? params.style : "vega";
  const mode = isMode(params.mode) ? params.mode : "light";
  return <Gallery style={style} mode={mode} />;
}
