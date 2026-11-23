# Manna Jewellery Works — Fine Jewellery Catalogue & Manager Portal

An exclusive, mobile-first, TikTok/Instagram-inspired luxury jewellery catalogue web application developed specifically for **Manna Jewellery Works**. Designed for deployment directly on **GitHub Pages**.

---

## ✨ Key Features

### 💎 Customer Experience (TikTok & Instagram Style Vertical Reels)
- **Vertical Feed & Reel Mode**: Edge-to-edge luxury jewellery cards with multi-angle image carousels, smooth snap scrolling, and phone-first layout.
- **Instagram Double-Tap to Like**: Double-tap anywhere on a product photo to send flying animated heart particles.
- **Public Likes & Views Counters**: Real-time customer like counts and view tracking just like Instagram.
- **Trending Ranking**: Products automatically sorted by popularity (likes + views), newest arrivals, or net weight.
- **Interactive Catalogue Tree Drawer**: Complete hierarchical navigation for Gold & Silver:
  - Gold (For Men, For Women, Unisex, Miscellaneous)
  - Silver (For Men, For Women, Unisex, Puja Items, Miscellaneous Items)
  - Sub-categories (Necklaces, Earrings, Bangles & Bracelets, etc.)
  - Sub-sub-categories (Rani Haar, Sita Haar, Pati Haar, Jhumka, Chandbali, Pola, Sakha, etc.)
- **Direct Image Gallery**: Instant visual photo grid for **Puja Items** and **Miscellaneous** items.
- **WhatsApp Direct Inquiries**: One-touch WhatsApp button with pre-filled message including Item Code, Title, Net Weight, and metal purity.
- **Alternative Grid View**: Toggle between full Reels view and 2-column/4-column catalog grid.

---

### 🔐 Manager's Portal
Access the manager portal by **tapping/clicking on the store logo** at the top of the catalogue.

1. **➕ Add Product**:
   - Select Jewellery Type (**Gold** / **Silver**).
   - Auto-generated unique Item Code (e.g., `MJW-GLD-101`, `MJW-SLV-201`) with refresh button.
   - Cascading Main Category, Sub-Category, and Sub-Sub-Category selection based on your exact tree.
   - Product Title & Net Weight (in grams).
   - **Pricing System**:
     - **Fixed Price (Thouko)**: Fixed total price unaffected by metal rate fluctuations.
     - **Floating Pricing System**: Calculated dynamically based on live metal rates + making charges (percentage or fixed per gram).
     - *Customer Privacy*: Customers never see the words "Thouko", "Floating", or making charge calculations.
   - **Front Page Display Preference**: Choose whether customers see Approximate Weight, Approximate Price, Both, or None.
   - **Media Upload**: Supports multiple photos/videos via device file picker or image URLs.
2. **⚖️ Metals & 48-Hour Pricing Rule**:
   - Set standard **22K Gold Rate** (₹/gram).
   - Set **Silver 92.50 Hallmarked Rate** (₹/gram).
   - Set **Silver 80.00 Below-Hallmarked Rate** (₹/gram).
   - **48-Hour Price Validity Rule**: Prices are only shown to customers if rates were updated within the last 48 hours. If 48 hours pass without an update, prices are automatically hidden and show a polite *"Price on Request"* badge.
   - **1-Click Reset**: "Reset 48h Clock to Now" button instantly refreshes the 48-hour window.
   - Default making charges for Gold (% or ₹/g) and Silver (% or ₹/g).
3. **🌳 Manage Categories & Sub-Categories**:
   - Add new categories, rename, or delete existing categories.
4. **📦 Products Section**:
   - Live search by Item Code or Title.
   - View likes, views, weights, and pricing formulas.
   - Edit or delete products.
5. **📊 Insights**:
   - Total catalogue items, total customer likes, total views.
   - Top 5 Most Liked pieces and Top 5 Most Viewed pieces.
6. **⚙️ Others**:
   - Upload custom store logo.
   - Update 4-digit PIN (default `1958`).
   - Update customer WhatsApp number.
   - **How to Publish on GitHub Pages**:
     - Green button: **"Download Ready-to-Upload GitHub Pages ZIP"** (`manna-jewellery-catalog-github.zip`).
   - Backup & Restore JSON files.

---

## 🚀 How to Host on GitHub Pages (Step-by-Step)

1. Go to [GitHub.com](https://github.com) and create a new repository (e.g. `manna-jewellery-works`).
2. Download or locate `manna-jewellery-catalog-github.zip` (already prepared in this folder or downloaded from the Manager Portal).
3. Extract the ZIP file. It contains:
   - `index.html`
   - `style.css`
   - `app.js`
   - `data.js`
   - `logo.jpg`
4. Upload these files to your GitHub repository root.
5. In GitHub, go to **Settings** &rarr; **Pages** &rarr; **Source**: Select `Deploy from a branch` &rarr; Branch: `main` / `root` &rarr; Click **Save**.
6. In 1 minute, your site will be live at `https://<your-username>.github.io/<repo-name>/`!

### Continuous Updates & Saving on GitHub Pages
When you add products or update metal rates inside the Manager's Portal in your browser:
- Everything is instantly saved in your device's browser memory (LocalStorage & IndexedDB).
- Whenever you want your online customers to see the newly added items, simply go to Manager Portal &rarr; **Others** &rarr; Tap **"Download Ready-to-Upload GitHub Pages ZIP"** and drag the updated `data.js` (or ZIP) into your GitHub repository!
