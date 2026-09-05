import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { promises as fs } from "fs";
import path from "node:path";

export type SocialProofInput = {
  tenantName: string;
  tenantLogoUrl?: string | null;
  primaryColor?: string;
  rating: number; // 1-5
  customerName?: string | null;
  message: string;
  categoryName?: string | null;
  branchName?: string | null;
  template: "star-five" | "star-quote" | "minimal-card";
};

export type SocialProofOutput = {
  png: Buffer;
  width: number;
  height: number;
  dataUrl: string;
};

// Cache the font so we don't re-read on every render
let fontCache: Buffer | null = null;
async function loadFont(): Promise<Buffer> {
  if (fontCache) return fontCache;
  // Try to load a system font (Inter is preferred)
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(/*turbopackIgnore: true*/ p);
      fontCache = buf;
      return buf;
    } catch {}
  }
  throw new Error("No font found for satori. Install dejavu or liberation fonts.");
}

async function loadRegularFont(): Promise<Buffer> {
  // Try regular weight
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(/*turbopackIgnore: true*/ p);
    } catch {}
  }
  return loadFont(); // fallback
}

/**
 * Render a social proof image to PNG buffer.
 * Uses Satori (JSX→SVG) + Resvg (SVG→PNG).
 */
export async function renderSocialProof(
  input: SocialProofInput
): Promise<SocialProofOutput> {
  const width = 1080;
  const height = 1350; // 4:5 portrait — Instagram-friendly
  const primary = input.primaryColor || "#0ea5e9";
  const accent = "#0f172a";

  const fontBold = await loadFont();
  const fontRegular = await loadRegularFont();

  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  const customerLine = input.customerName
    ? `— ${input.customerName}`
    : "— Pelanggan";

  let jsx: any;

  if (input.template === "star-five") {
    // Big 5 stars, big quote
    jsx = {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)`,
          color: "white",
          padding: "80px 70px",
          fontFamily: "Inter",
        },
        children: [
          // Top: stars
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "120px",
                color: "#facc15",
                marginBottom: "40px",
                letterSpacing: "8px",
              },
              children: stars,
            },
          },
          // Quote
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "60px",
                fontWeight: 700,
                lineHeight: 1.2,
                color: "white",
                marginBottom: "50px",
                flex: 1,
              },
              children: `“${truncate(input.message, 240)}”`,
            },
          },
          // Customer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "40px",
                color: "rgba(255,255,255,0.9)",
                marginBottom: "30px",
              },
              children: customerLine,
            },
          },
          // Business
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "20px",
                paddingTop: "30px",
                borderTop: "2px solid rgba(255,255,255,0.3)",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      background: "white",
                      color: primary,
                      fontSize: "32px",
                      fontWeight: 700,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    children: (input.tenantName[0] ?? "B").toUpperCase(),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column" },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: "36px",
                            fontWeight: 700,
                            color: "white",
                          },
                          children: input.tenantName,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: "24px",
                            color: "rgba(255,255,255,0.7)",
                          },
                          children: input.branchName ?? "Bukti dari pelanggan",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };
  } else if (input.template === "star-quote") {
    // Light/cream background, dark text, decorative quote mark
    jsx = {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#fdf6e3",
          color: accent,
          padding: "100px 80px",
          fontFamily: "Inter",
        },
        children: [
          // Big quote mark
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "300px",
                color: primary,
                lineHeight: 0.6,
                marginBottom: "20px",
                fontWeight: 700,
              },
              children: "“",
            },
          },
          // Message
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "56px",
                fontWeight: 700,
                lineHeight: 1.25,
                color: accent,
                flex: 1,
                marginBottom: "50px",
              },
              children: truncate(input.message, 260),
            },
          },
          // Bottom row: stars + customer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                paddingTop: "40px",
                borderTop: `3px solid ${primary}`,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontSize: "60px",
                      color: "#facc15",
                      letterSpacing: "4px",
                    },
                    children: stars,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: "32px",
                                  fontWeight: 700,
                                  color: accent,
                                },
                                children: input.customerName ?? "Pelanggan Puas",
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  fontSize: "24px",
                                  color: "#64748b",
                                },
                                children: input.branchName ?? input.tenantName,
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: "28px",
                            fontWeight: 700,
                            color: primary,
                          },
                          children: input.tenantName,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };
  } else {
    // minimal-card: white, super clean, single column
    jsx = {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "white",
          color: accent,
          padding: "100px 80px",
          fontFamily: "Inter",
        },
        children: [
          // Logo
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "20px",
                marginBottom: "60px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      width: "80px",
                      height: "80px",
                      borderRadius: "20px",
                      background: primary,
                      color: "white",
                      fontSize: "44px",
                      fontWeight: 700,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    children: (input.tenantName[0] ?? "B").toUpperCase(),
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: "36px",
                            fontWeight: 700,
                            color: accent,
                          },
                          children: input.tenantName,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontSize: "22px",
                            color: "#64748b",
                          },
                          children: input.categoryName ?? "Feedback",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Stars
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "72px",
                color: "#facc15",
                marginBottom: "40px",
                letterSpacing: "6px",
              },
              children: stars,
            },
          },
          // Message
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: "52px",
                fontWeight: 500,
                lineHeight: 1.35,
                color: accent,
                flex: 1,
              },
              children: truncate(input.message, 280),
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "40px",
                borderTop: "1px solid #e2e8f0",
                fontSize: "24px",
                color: "#64748b",
              },
              children: [
                customerLine,
                input.branchName ?? "",
              ],
            },
          },
        ],
      },
    };
  }

  // Wrap in root
  const root: any = {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: `${width}px`,
        height: `${height}px`,
        fontFamily: "Inter",
      },
      children: jsx,
    },
  };

  const svg = await satori(root as any, {
    width,
    height,
    fonts: [
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
      { name: "Inter", data: fontRegular, weight: 500, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "transparent",
  });
  const png = resvg.render().asPng();

  return {
    png: Buffer.from(png),
    width,
    height,
    dataUrl: `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
  };
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
