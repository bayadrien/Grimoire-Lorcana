import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grimoire Lorcana",
    short_name: "Grimoire",
    description: "Ton grimoire de collection Disney Lorcana",
    start_url: "/",
    display: "standalone",
    background_color: "#050711",
    theme_color: "#11152b",
    icons: [
      { src: "/grimoire-icon.png", sizes: "1280x1280", type: "image/png", purpose: "any" },
      { src: "/grimoire-icon.png", sizes: "1280x1280", type: "image/png", purpose: "maskable" },
    ],
  };
}
