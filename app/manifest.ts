import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platepal",
    short_name: "Platepal",
    description: "Snap your fridge. Get tonight's recipe.",
    start_url: "/app",
    display: "standalone",
    background_color: "#17150F",
    theme_color: "#17150F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
