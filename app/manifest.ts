import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Grimoire Lorcana", short_name: "Grimoire", description: "Ton grimoire de collection Disney Lorcana", start_url: "/", display: "standalone", background_color: "#f8f5ef", theme_color: "#513b83", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] };
}
