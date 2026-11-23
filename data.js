// Default initial data for Manna Jewellery Works
const DEFAULT_STORE_CONFIG = {
  storeName: "Manna Jewellery Works",
  tagline: "Exclusive Traditional & Modern Fine Jewellery",
  phone: "+91 98741 26698",
  whatsappNumber: "919874126698",
  address: "Bagnan station road north, near cosmo bazar, howrah, west Bengal, PIN- 711303",
  logoUrl: "logo.jpg",
  pin: "1958",
  metalRates: {
    gold22k: 7250, // in INR per gram
    silver925: 96,  // in INR per gram (Hallmarked 92.50)
    silver800: 82,  // in INR per gram (Below Hallmarked 80.00)
    lastUpdated: new Date().toISOString(), // automatically set to now initially
    defaultGoldMakingType: "percent", // 'percent' or 'fixed_per_gram'
    defaultGoldMakingValue: 12, // 12%
    defaultSilverMakingType: "fixed_per_gram",
    defaultSilverMakingValue: 25 // 25 rs per gram
  }
};

const DEFAULT_CATEGORY_TREE = {
  GOLD: {
    "FOR MEN": [
      "Chains",
      "Rings",
      "Bracelets / Kada",
      "Pendants",
      "Ear Studs",
      "Cufflinks",
      "Brooches",
      "Men’s Wedding Collection"
    ],
    "FOR WOMEN": {
      "Necklaces": [
        "Choker / Chik",
        "Long Necklace / Haar",
        "Rani Haar",
        "Sita Haar",
        "Pati Haar",
        "Mangalsutra",
        "Layered Necklace"
      ],
      "Earrings": [
        "Jhumka",
        "Ear Tops",
        "Studs",
        "Chandbali",
        "Kaan",
        "Dangler"
      ],
      "Bangles & Bracelets": [
        "Kada",
        "Sakha",
        "Churi",
        "Mantasha",
        "Bracelet",
        "Pola"
      ],
      "Rings": [],
      "Nose Pins / Nath": [],
      "Pendants": [],
      "Chains": [],
      "Anklets / Nupur": [],
      "Toe Rings": [],
      "Hair Accessories / Tikli": [],
      "Bridal Jewellery Set": [],
      "Daily Wear Collection": [],
      "Office Wear Collection": [],
      "Party Wear Collection": []
    },
    "UNISEX": [
      "Chains",
      "Pendants",
      "Rings",
      "Bracelets",
      "Couple Rings",
      "Couple Pendants",
      "Religious Pendants",
      "Initial / Name Pendants",
      "Minimal Daily Wear"
    ],
    "PUJA ITEMS": [
      "Pure Gold Coins & Bars",
      "Gold Belpata & Om Pendants",
      "Gold Diya / Pradip",
      "Sindoor Kouto"
    ],
    "MISCELLANEOUS": [] // Directly show images of products
  },
  SILVER: {
    "FOR MEN": [
      "Chains",
      "Rings",
      "Bracelets / Kada",
      "Pendants",
      "Ear Studs",
      "Cufflinks",
      "Brooches",
      "Keychains",
      "Silver Coins",
      "Men’s Oxidised Collection"
    ],
    "FOR WOMEN": {
      "Necklaces": [
        "Choker",
        "Long Necklace",
        "Chains",
        "Layered Necklace"
      ],
      "Earrings": [
        "Jhumka",
        "Studs",
        "Ear Tops",
        "Chandbali",
        "Danglers",
        "Kaan"
      ],
      "Bangles & Bracelets": [
        "Noa",
        "Bracelet",
        "Shaka",
        "Pola"
      ],
      "Rings": [],
      "Nose Pins / Nath": [],
      "Anklets / Nupur": [],
      "Pendants": [],
      "Oxidised Jewellery": [],
      "Daily Wear Collection": [],
      "Office Wear Collection": [],
      "Party Wear Collection": []
    },
    "UNISEX": [
      "Chains",
      "Pendants",
      "Rings",
      "Bracelets",
      "Couple Rings",
      "Couple Pendants",
      "Religious Pendants",
      "Minimal Daily Wear"
    ],
    "PUJA ITEMS": [], // Directly show images of products
    "MISCELLANEOUS ITEMS": [] // Directly show images of products
  }
};

// Curated high-aesthetic initial catalogue with authentic Bengali & Indian traditional jewellery
const INITIAL_PRODUCTS = [
  {
    id: "MJW-GLD-101",
    itemCode: "MJW-GLD-101",
    title: "Heritage Royal 22K Gold Rani Haar",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "FOR WOMEN",
    subCategory: "Necklaces",
    subSubCategory: "Rani Haar",
    netWeight: 42.50, // in grams
    pricingSystem: "floating", // 'fixed' (thouko) or 'floating'
    fixedPrice: 0,
    makingChargeType: "percent", // 'percent' or 'fixed_per_gram'
    makingChargeValue: 14, // 14%
    displayPreference: "both", // 'weight', 'price', 'both', 'none'
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 342,
    views: 1890,
    createdAt: "2026-11-20T10:00:00.000Z",
    description: "Traditional handmade antique finish 22K gold Rani Haar adorned with intricate filigree peacock motifs, crafted by master artisans."
  },
  {
    id: "MJW-GLD-102",
    itemCode: "MJW-GLD-102",
    title: "Classic Bengali Gold Pola Badhano Bangles (Pair)",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "FOR WOMEN",
    subCategory: "Bangles & Bracelets",
    subSubCategory: "Pola",
    netWeight: 14.80,
    pricingSystem: "fixed", // Thouko
    fixedPrice: 128500,
    makingChargeType: "percent",
    makingChargeValue: 0,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1611591475152-4735d387c982?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 489,
    views: 2450,
    createdAt: "2026-11-21T11:30:00.000Z",
    description: "Pure red coral Pola bordered in ornate 22 Karat yellow gold floral lattice work. Fixed price heritage collection."
  },
  {
    id: "MJW-GLD-103",
    itemCode: "MJW-GLD-103",
    title: "Men's Solid 22K Gold Royal Elephant Kada",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "FOR MEN",
    subCategory: "Bracelets / Kada",
    subSubCategory: "",
    netWeight: 32.10,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "fixed_per_gram",
    makingChargeValue: 550, // Rs 550/g making charge
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 512,
    views: 3100,
    createdAt: "2026-11-21T14:15:00.000Z",
    description: "Bold masculine heavy 22K gold kada featuring embossed twin elephant heads with etched diamond-cut texture."
  },
  {
    id: "MJW-GLD-104",
    itemCode: "MJW-GLD-104",
    title: "Traditional Bengali Peacock Gold Jhumka Earrings",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "FOR WOMEN",
    subCategory: "Earrings",
    subSubCategory: "Jhumka",
    netWeight: 18.25,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "percent",
    makingChargeValue: 12,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 673,
    views: 4200,
    createdAt: "2026-11-22T09:00:00.000Z",
    description: "Exquisite triple-tier 22K gold jhumkas with hanging micro beads and Mayur filigree ear-top studs."
  },
  {
    id: "MJW-GLD-105",
    itemCode: "MJW-GLD-105",
    title: "Eternal Couple Matching 22K Gold Wedding Bands",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "UNISEX",
    subCategory: "Couple Rings",
    subSubCategory: "",
    netWeight: 9.60,
    pricingSystem: "fixed",
    fixedPrice: 85000,
    makingChargeType: "percent",
    makingChargeValue: 0,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1603561596112-0a132b757442?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 295,
    views: 1540,
    createdAt: "2026-11-22T10:45:00.000Z",
    description: "Sleek dual satin-brushed gold couple bands with polished inner comfort contour."
  },
  {
    id: "MJW-GLD-106",
    itemCode: "MJW-GLD-106",
    title: "Artisan Gold Filigree Lotus Brooch & Pendant",
    metal: "GOLD",
    metalPurity: "22k",
    mainCategory: "MISCELLANEOUS",
    subCategory: "",
    subSubCategory: "",
    netWeight: 11.20,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "percent",
    makingChargeValue: 15,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 184,
    views: 920,
    createdAt: "2026-11-22T13:20:00.000Z",
    description: "Multifunctional 22k piece that can be worn either as a brooch or a statement pendant."
  },
  {
    id: "MJW-SLV-201",
    itemCode: "MJW-SLV-201",
    title: "92.5 Sterling Silver Bridal Ghungroo Payal (Pair)",
    metal: "SILVER",
    metalPurity: "92.5",
    mainCategory: "FOR WOMEN",
    subCategory: "Anklets / Nupur",
    subSubCategory: "",
    netWeight: 98.00,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "fixed_per_gram",
    makingChargeValue: 28, // Rs 28/g making
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 721,
    views: 3890,
    createdAt: "2026-11-21T16:00:00.000Z",
    description: "Authentic Bengali traditional silver Nupur with musical bells, crafted in certified 92.5 hallmark sterling silver."
  },
  {
    id: "MJW-SLV-202",
    itemCode: "MJW-SLV-202",
    title: "Men's 92.5 Sterling Silver Heavy Cuban Link Chain",
    metal: "SILVER",
    metalPurity: "92.5",
    mainCategory: "FOR MEN",
    subCategory: "Chains",
    subSubCategory: "",
    netWeight: 45.00,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "fixed_per_gram",
    makingChargeValue: 30,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 410,
    views: 2100,
    createdAt: "2026-11-22T12:00:00.000Z",
    description: "Diamond-cut Cuban chain for men with high polished anti-tarnish rhodium finish."
  },
  {
    id: "MJW-SLV-203",
    itemCode: "MJW-SLV-203",
    title: "Vintage Tribal Oxidised Silver Chandbali Earrings",
    metal: "SILVER",
    metalPurity: "80.0",
    mainCategory: "FOR WOMEN",
    subCategory: "Earrings",
    subSubCategory: "Chandbali",
    netWeight: 26.50,
    pricingSystem: "fixed", // Thouko
    fixedPrice: 3800,
    makingChargeType: "percent",
    makingChargeValue: 0,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 856,
    views: 4950,
    createdAt: "2026-11-22T14:30:00.000Z",
    description: "Boho-chic handcrafted oxidised silver chandbalis with ornate filigree arches and tiny silver droplets."
  },
  {
    id: "MJW-SLV-204",
    itemCode: "MJW-SLV-204",
    title: "Sacred Pure Silver Laxmi-Ganesh Puja Idol & Coin Set",
    metal: "SILVER",
    metalPurity: "92.5",
    mainCategory: "PUJA ITEMS",
    subCategory: "",
    subSubCategory: "",
    netWeight: 110.00,
    pricingSystem: "fixed",
    fixedPrice: 15500,
    makingChargeType: "percent",
    makingChargeValue: 0,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1608042314453-ae338d80c427?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 618,
    views: 3120,
    createdAt: "2026-11-22T15:00:00.000Z",
    description: "Divine idol set in 92.5 silver for auspicious home puja and Diwali blessings."
  },
  {
    id: "MJW-SLV-205",
    itemCode: "MJW-SLV-205",
    title: "Hand-engraved Pure Silver Puja Thali with Pancha Pradip",
    metal: "SILVER",
    metalPurity: "92.5",
    mainCategory: "PUJA ITEMS",
    subCategory: "",
    subSubCategory: "",
    netWeight: 240.00,
    pricingSystem: "floating",
    fixedPrice: 0,
    makingChargeType: "fixed_per_gram",
    makingChargeValue: 35,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 472,
    views: 2200,
    createdAt: "2026-11-22T16:10:00.000Z",
    description: "Ornate traditional silver puja thali with intricate floral borders, bell, and diya."
  },
  {
    id: "MJW-SLV-206",
    itemCode: "MJW-SLV-206",
    title: "Artistic Silver Filigree Lord Ganesha Frame",
    metal: "SILVER",
    metalPurity: "92.5",
    mainCategory: "MISCELLANEOUS ITEMS",
    subCategory: "",
    subSubCategory: "",
    netWeight: 35.00,
    pricingSystem: "fixed",
    fixedPrice: 6200,
    makingChargeType: "percent",
    makingChargeValue: 0,
    displayPreference: "both",
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80"
    ],
    likes: 310,
    views: 1420,
    createdAt: "2026-11-22T17:00:00.000Z",
    description: "Delicate Tarakasi silver filigree table-top keepsake frame."
  }
];
