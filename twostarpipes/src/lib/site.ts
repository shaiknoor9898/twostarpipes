import pvcImg from "@/assets/product-pvc-grey.jpg";
import agriImg from "@/assets/product-agricultural.jpg";
import casingImg from "@/assets/product-casing.jpg";
import upvcImg from "@/assets/product-upvc-white.jpg";
import electricalImg from "@/assets/product-electrical.jpg";
import dripImg from "@/assets/product-drip-pipes.jpg";
import dripFittingsImg from "@/assets/product-drip-fittings.jpg";

// Verified contact details (from the company's business card).
export const SITE = {
  name: "Two Star Pipes Industries",
  tagline: "From Perfect Technology to Quality Production",
  slogan: "Be a Star, Be with Star",
  years: 37,
  farmersServed: "1,00,000+",
  proprietor: "S. Rahamathulla",
  // From the company's own website (twostarpipes.com).
  founded: 1989,
  founder: "Al-Haj Shaik Rahamathulla",
  leaders: ["Shaik Firoz Ahamed", "Shaik Fuzail Ahamed"],
  phone: "+91 98481 61127",
  phoneHref: "tel:+919848161127",
  phone2: "+91 95055 03550",
  phone2Href: "tel:+919505503550",
  // Company WhatsApp destination confirmed by the owner.
  whatsappHref: "https://wa.me/919505503550",
  email: "twostarpipes@yahoo.com",
  website: "www.twostarpipes.com",
  addressLine1: "38/109-C, Chittor Road, Beside Sub Station",
  addressLine2: "Rayachoty – 516269, Kadapa (Dist), Andhra Pradesh",
  address: "38/109-C, Chittor Road, Beside Sub Station, Rayachoty – 516269, Kadapa (Dist), A.P.",
  city: "Rayachoty, Kadapa (Dist), A.P.",
  // OpenStreetMap embed (Google's map frame is blocked on some networks). Pin = factory on NH-14, beside sub station.
  mapEmbed:
    "https://www.openstreetmap.org/export/embed.html?bbox=78.7398%2C14.0388%2C78.7598%2C14.0528&layer=mapnik&marker=14.045779%2C78.749854",
  mapLink: "https://www.google.com/maps/search/?api=1&query=14.045779%2C78.749854",
  // Working hours not yet confirmed by the owner.
  hours: "Mon – Sat, 9:00 AM – 7:00 PM",
};

/** Pressure classes printed on our pipes (kgf/cm²). */
export const GAUGES = ["4 kgf/cm²", "6 kgf/cm²"];

export type ProductSlug =
  "pvc" | "agricultural" | "casing" | "upvc" | "electrical" | "drip" | "drip-fittings";
export type Product = {
  slug: ProductSlug;
  name: string;
  short: string;
  image: string;
  description: string;
  uses: string[];
  sizes: string[];
  gauges?: string[];
  advantages?: string[];
};

export const CASING_ADVANTAGES = [
  "Longer lasting.",
  "Corrosion resistant.",
  "Higher well yields.",
  "Sizes available from 1½″ (40mm) to 10″ (250mm).",
  "Non-corrosive & non-conductive.",
  "Chemical resistant.",
  "Non-toxic, our pipes impart no taste to the water.",
  "Does not support bacterial growth.",
  "Long life & does not deteriorate as metal casing pipe does.",
  "Strong and hence the chances of wall collapse are very remote.",
  "Lighter than steel in weight, so pipes are much easier to transport & handle.",
  "Easy to cut and fabricate whenever required.",
];

export const PRODUCTS: Product[] = [
  {
    slug: "pvc",
    name: "PVC Pipes",
    short: "Pressure & water supply",
    image: pvcImg,
    description:
      "Strong, lightweight PVC pipes for water supply, pump lines and drainage. Made to carry water season after season without rust or leaks.",
    uses: ["Water supply", "Pump & motor lines", "Drainage", "Village pipelines"],
    sizes: [
      "20 mm",
      "25 mm",
      "32 mm",
      "40 mm",
      "50 mm",
      "63 mm",
      "75 mm",
      "90 mm",
      "110 mm",
      "140 mm",
      "160 mm",
      "200 mm",
    ],
    gauges: GAUGES,
  },
  {
    slug: "agricultural",
    name: "Agricultural Pipes",
    short: "Farm irrigation",
    image: agriImg,
    description:
      "PVC irrigation pipes made for Indian farms — carry borewell and canal water across your fields with low friction and long life under the sun.",
    uses: ["Field irrigation", "Borewell to field", "Sprinkler mains", "Farm ponds"],
    sizes: ["40 mm", "50 mm", "63 mm", "75 mm", "90 mm", "110 mm", "140 mm", "160 mm", "200 mm"],
    gauges: GAUGES,
  },
  {
    slug: "casing",
    name: "Casing Pipes",
    short: "Borewell casing & screen",
    image: casingImg,
    description:
      "PVC casing and ribbed screen pipes for bore wells. Threaded joints, corrosion-proof walls and easy installation even at great depth.",
    uses: ["Bore wells", "Ribbed screen pipes", "Threaded joints", "Deep installation"],
    sizes: [
      '1½" (40 mm)',
      '2" (50 mm)',
      '3" (75 mm)',
      '4" (110 mm)',
      '5" (140 mm)',
      '6" (160 mm)',
      '8" (200 mm)',
      '10" (250 mm)',
    ],
    advantages: CASING_ADVANTAGES,
  },
  {
    slug: "upvc",
    name: "UPVC Pipes",
    short: "Plumbing & buildings",
    image: upvcImg,
    description:
      "Rigid white UPVC pipes for homes, buildings and pressure water lines. Rust-free, smooth inside and easy to join.",
    uses: ["Household plumbing", "Pressure water lines", "Column pipes", "Overhead tanks"],
    sizes: ["½ inch", "¾ inch", "1 inch", "1¼ inch", "1½ inch", "2 inch", "3 inch", "4 inch"],
  },
  {
    slug: "electrical",
    name: "Electrical Pipes",
    short: "Conduits & wiring",
    image: electricalImg,
    description:
      "PVC electrical conduit pipes, bends and junction boxes that keep wiring safe inside walls, ceilings and underground.",
    uses: ["House wiring", "Concealed wiring", "Commercial buildings", "Cable protection"],
    sizes: ["16 mm", "20 mm", "25 mm", "32 mm"],
  },
  {
    slug: "drip",
    name: "Drip Pipes",
    short: "Drip irrigation",
    image: dripImg,
    description:
      "Drip lateral pipes that give every plant the right amount of water at its root — saving water, fertiliser and labour.",
    uses: ["Saves water", "Vegetables & fruit crops", "Even watering", "Less weeds"],
    sizes: ["12 mm", "16 mm", "20 mm"],
  },
  {
    slug: "drip-fittings",
    name: "Drip Fittings",
    short: "Drip system accessories",
    image: dripFittingsImg,
    description:
      "Complete drip fittings — grommets, take-offs, joiners, tees, elbows, end caps, mini valves, drippers and filters — to set up your full drip system.",
    uses: [
      "Grommets & take-offs",
      "Joiners, tees & elbows",
      "End caps & mini valves",
      "Drippers & filters",
    ],
    sizes: ["12 mm", "16 mm", "20 mm"],
  },
];
