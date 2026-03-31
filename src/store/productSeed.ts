// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CATALOG — 300-record seed database using ALL 24 property types
// Doubled attributes, real lat/lng for map view, 2 dashboard views
// ═══════════════════════════════════════════════════════════════════════════════

import type { DatabaseSchema, Page, ViewConfig, SelectOption } from '../types/database';

export const DB_PRODUCTS = 'db-products';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _now = new Date().toISOString();
const _d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// ─── Select Options ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: SelectOption[] = [
  { id: 'pcat-elec',   value: 'Electronics',       color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'pcat-cloth',  value: 'Clothing',           color: 'bg-pink-surface-muted text-pink-text-tag' },
  { id: 'pcat-home',   value: 'Home & Kitchen',     color: 'bg-amber-surface-muted text-amber-text-tag' },
  { id: 'pcat-book',   value: 'Books & Media',      color: 'bg-indigo-surface-muted text-indigo-text-tag' },
  { id: 'pcat-sport',  value: 'Sports & Outdoors',  color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'pcat-beauty', value: 'Health & Beauty',     color: 'bg-rose-surface-muted text-rose-text-tag' },
  { id: 'pcat-food',   value: 'Food & Grocery',     color: 'bg-orange-surface-muted text-orange-text-tag' },
  { id: 'pcat-toys',   value: 'Toys & Games',       color: 'bg-purple-surface-muted text-purple-text-tag' },
  { id: 'pcat-tools',  value: 'Tools & Hardware',   color: 'bg-surface-muted text-ink-strong' },
  { id: 'pcat-garden', value: 'Garden & Outdoor',   color: 'bg-emerald-surface-muted text-emerald-text-tag' },
];

const TAG_OPTIONS: SelectOption[] = [
  { id: 'ptag-prem',   value: 'Premium',     color: 'bg-warning-surface-muted text-warning-text-tag' },
  { id: 'ptag-org',    value: 'Organic',      color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'ptag-ltd',    value: 'Limited',      color: 'bg-danger-surface-muted text-danger-text-tag' },
  { id: 'ptag-best',   value: 'Bestseller',   color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'ptag-clear',  value: 'Clearance',    color: 'bg-surface-muted text-ink-body' },
  { id: 'ptag-new',    value: 'New Arrival',  color: 'bg-cyan-surface-muted text-cyan-text-tag' },
  { id: 'ptag-eco',    value: 'Eco-Friendly', color: 'bg-teal-surface-muted text-teal-text-tag' },
  { id: 'ptag-hand',   value: 'Handmade',     color: 'bg-violet-surface-muted text-violet-text-tag' },
];

const STOCK_OPTIONS: SelectOption[] = [
  { id: 'pstk-in',   value: 'In Stock',      color: 'bg-success-surface-medium text-success-text-tag' },
  { id: 'pstk-low',  value: 'Low Stock',     color: 'bg-warning-surface-medium text-warning-text-tag' },
  { id: 'pstk-out',  value: 'Out of Stock',  color: 'bg-danger-surface-medium text-danger-text-tag' },
  { id: 'pstk-disc', value: 'Discontinued',  color: 'bg-surface-strong text-ink-body' },
  { id: 'pstk-pre',  value: 'Pre-order',     color: 'bg-accent-subtle text-accent-text-bold' },
];

const CONDITION_OPTIONS: SelectOption[] = [
  { id: 'pcnd-new',   value: 'New',          color: 'bg-success-surface-muted text-success-text-bold' },
  { id: 'pcnd-ref',   value: 'Refurbished',  color: 'bg-accent-muted text-accent-text' },
  { id: 'pcnd-used',  value: 'Used',         color: 'bg-amber-surface-muted text-amber-text-bold' },
  { id: 'pcnd-open',  value: 'Open Box',     color: 'bg-orange-surface-muted text-orange-text-bold' },
];

const RATING_OPTIONS: SelectOption[] = [
  { id: 'prt-5', value: '★★★★★ (5.0)', color: 'bg-warning-surface-muted text-warning-text-tag' },
  { id: 'prt-4', value: '★★★★☆ (4.0)', color: 'bg-warning-surface text-warning-text-bold' },
  { id: 'prt-3', value: '★★★☆☆ (3.0)', color: 'bg-orange-surface text-orange-text-bold' },
  { id: 'prt-2', value: '★★☆☆☆ (2.0)', color: 'bg-danger-surface text-danger-text-bold' },
  { id: 'prt-1', value: '★☆☆☆☆ (1.0)', color: 'bg-danger-surface-muted text-danger-text-tag' },
];

const SHIPPING_OPTIONS: SelectOption[] = [
  { id: 'pship-free',  value: 'Free Shipping',   color: 'bg-success-surface-muted text-success-text-bold' },
  { id: 'pship-std',   value: 'Standard',        color: 'bg-surface-tertiary text-ink-body' },
  { id: 'pship-exp',   value: 'Express',         color: 'bg-accent-muted text-accent-text' },
  { id: 'pship-ovn',   value: 'Overnight',       color: 'bg-purple-surface-muted text-purple-text-bold' },
  { id: 'pship-pick',  value: 'Store Pickup',    color: 'bg-amber-surface-muted text-amber-text-bold' },
];

const BRAND_TAG_OPTIONS: SelectOption[] = [
  { id: 'pbrd-lux',   value: 'Luxury',       color: 'bg-amber-surface-muted text-amber-text-tag' },
  { id: 'pbrd-bud',   value: 'Budget',       color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'pbrd-mid',   value: 'Mid-Range',    color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'pbrd-des',   value: 'Designer',     color: 'bg-pink-surface-muted text-pink-text-tag' },
  { id: 'pbrd-gen',   value: 'Generic',      color: 'bg-surface-tertiary text-ink-body' },
  { id: 'pbrd-ind',   value: 'Independent',  color: 'bg-violet-surface-muted text-violet-text-tag' },
];

// ─── Schema (doubled properties — 48 total from 24 types) ───────────────────

export const productDatabase: DatabaseSchema = {
  id: DB_PRODUCTS,
  name: 'Product Catalog',
  icon: '🛍️',
  titlePropertyId: 'pp-name',
  properties: {
    // ── title ──
    'pp-name':         { id: 'pp-name',       name: 'Product Name',      type: 'title' },
    // ── text × 2 ──
    'pp-desc':         { id: 'pp-desc',       name: 'Description',       type: 'text' },
    'pp-notes':        { id: 'pp-notes',      name: 'Internal Notes',    type: 'text' },
    // ── number × 3 ──
    'pp-price':        { id: 'pp-price',      name: 'Price ($)',         type: 'number' },
    'pp-cost':         { id: 'pp-cost',       name: 'Cost ($)',          type: 'number' },
    'pp-weight':       { id: 'pp-weight',     name: 'Weight (kg)',       type: 'number' },
    // ── select × 4 ──
    'pp-category':     { id: 'pp-category',   name: 'Category',   type: 'select', options: CATEGORY_OPTIONS },
    'pp-condition':    { id: 'pp-condition',  name: 'Condition',  type: 'select', options: CONDITION_OPTIONS },
    'pp-rating':       { id: 'pp-rating',     name: 'Rating',     type: 'select', options: RATING_OPTIONS },
    'pp-shipping':     { id: 'pp-shipping',   name: 'Shipping',   type: 'select', options: SHIPPING_OPTIONS },
    // ── multi_select × 2 ──
    'pp-tags':         { id: 'pp-tags',       name: 'Tags',          type: 'multi_select', options: TAG_OPTIONS },
    'pp-brand-tags':   { id: 'pp-brand-tags', name: 'Brand Tier',    type: 'multi_select', options: BRAND_TAG_OPTIONS },
    // ── status ──
    'pp-stock':        {
      id: 'pp-stock', name: 'Stock Status', type: 'status',
      options: STOCK_OPTIONS,
      statusGroups: [
        { id: 'psg-avail',   label: 'Available',   color: 'bg-success-surface-medium text-success-text-tag',  optionIds: ['pstk-in', 'pstk-low'] },
        { id: 'psg-limited', label: 'Limited',      color: 'bg-warning-surface-medium text-warning-text-tag', optionIds: ['pstk-pre'] },
        { id: 'psg-gone',    label: 'Unavailable',  color: 'bg-danger-surface-medium text-danger-text-tag',      optionIds: ['pstk-out', 'pstk-disc'] },
      ],
    },
    // ── date × 2 ──
    'pp-release':      { id: 'pp-release',    name: 'Release Date',      type: 'date' },
    'pp-warranty-exp': { id: 'pp-warranty-exp', name: 'Warranty Expires', type: 'date' },
    // ── checkbox × 2 ──
    'pp-featured':     { id: 'pp-featured',   name: 'Featured',          type: 'checkbox' },
    'pp-returnable':   { id: 'pp-returnable', name: 'Returnable',        type: 'checkbox' },
    // ── person ──
    'pp-manager':      { id: 'pp-manager',    name: 'Product Manager',   type: 'person' },
    // ── user ──
    'pp-reviewer':     { id: 'pp-reviewer',   name: 'QA Reviewer',       type: 'user' },
    // ── url × 2 ──
    'pp-url':          { id: 'pp-url',        name: 'Product Page',      type: 'url' },
    'pp-manual-url':   { id: 'pp-manual-url', name: 'Manual / Doc',      type: 'url' },
    // ── email ──
    'pp-email':        { id: 'pp-email',      name: 'Vendor Email',      type: 'email' },
    // ── phone ──
    'pp-phone':        { id: 'pp-phone',      name: 'Vendor Phone',      type: 'phone' },
    // ── files_media ──
    'pp-image':        { id: 'pp-image',      name: 'Product Image',     type: 'files_media' },
    // ── relation ──
    'pp-related':      {
      id: 'pp-related', name: 'Related Assets', type: 'relation',
      relationConfig: { databaseId: 'db-inventory', type: 'one_way' },
    },
    // ── formula × 11 ──
    'pp-margin':       {
      id: 'pp-margin', name: 'Margin ($)', type: 'formula',
      formulaConfig: { expression: 'prop("Price ($)") - prop("Cost ($)")' },
    },
    'pp-margin-pct':   {
      id: 'pp-margin-pct', name: 'Margin %', type: 'formula',
      formulaConfig: { expression: 'if(prop("Price ($)") > 0, round((prop("Price ($)") - prop("Cost ($)")) / prop("Price ($)") * 100), 0)' },
    },
    'pp-price-tier':   {
      id: 'pp-price-tier', name: 'Price Tier', type: 'formula',
      formulaConfig: { expression: 'ifs(prop("Price ($)") >= 200, "Premium", prop("Price ($)") >= 100, "Mid-Range", prop("Price ($)") >= 50, "Standard", "Budget")' },
    },
    'pp-weight-label': {
      id: 'pp-weight-label', name: 'Weight Class', type: 'formula',
      formulaConfig: { expression: 'concat(ifs(prop("Weight (kg)") > 5, "Heavy", prop("Weight (kg)") > 2, "Medium", "Light"), " ", format(round(prop("Weight (kg)") * 1000)), "g")' },
    },
    'pp-days-listed':  {
      id: 'pp-days-listed', name: 'Days Listed', type: 'formula',
      formulaConfig: { expression: 'dateBetween(now(), prop("Release Date"), "days")' },
    },
    'pp-warranty-ok':  {
      id: 'pp-warranty-ok', name: 'Warranty OK', type: 'formula',
      formulaConfig: { expression: 'if(empty(prop("Warranty Expires")), false, prop("Warranty Expires") > now())' },
    },
    'pp-profit-score': {
      id: 'pp-profit-score', name: 'Profit Score', type: 'formula',
      formulaConfig: { expression: 'round(((prop("Price ($)") - prop("Cost ($)")) / max(prop("Cost ($)"), 1)) * sqrt(max(prop("Stock Qty"), 0)) * 10) / 10' },
    },
    'pp-inv-value':    {
      id: 'pp-inv-value', name: 'Inventory Value', type: 'formula',
      formulaConfig: { expression: 'round(prop("Price ($)") * prop("Stock Qty") * 100) / 100' },
    },
    'pp-is-bargain':   {
      id: 'pp-is-bargain', name: 'Is Bargain', type: 'formula',
      formulaConfig: { expression: 'and(prop("Price ($)") < 30, not(prop("Featured")), prop("Returnable"))' },
    },
    'pp-price-per-kg': {
      id: 'pp-price-per-kg', name: 'Price/kg', type: 'formula',
      formulaConfig: { expression: 'if(prop("Weight (kg)") > 0, round(prop("Price ($)") / prop("Weight (kg)") * 100) / 100, 0)' },
    },
    'pp-deal-tag':     {
      id: 'pp-deal-tag', name: 'Deal Tag', type: 'formula',
      formulaConfig: { expression: 'ifs(and(prop("Price ($)") < 20, prop("Returnable")), "🔥 Hot Deal", and(prop("Price ($)") < 50, not(prop("Featured"))), "💰 Value Pick", prop("Featured"), "⭐ Featured", "📦 Standard")' },
    },
    // ── rollup ──
    'pp-asset-count':  {
      id: 'pp-asset-count', name: 'Asset Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'pp-related', targetPropertyId: 'prop-price', function: 'count' },
    },
    // ── button ──
    'pp-buy':          {
      id: 'pp-buy', name: 'Buy Now', type: 'button',
      buttonConfig: { label: 'Buy', action: 'open_url', url: 'https://shop.example.com' },
    },
    // ── place × 2 (with real coords) ──
    'pp-warehouse':    { id: 'pp-warehouse',    name: 'Warehouse',        type: 'place' },
    'pp-origin':       { id: 'pp-origin',       name: 'Origin Country',   type: 'place' },
    // ── id ──
    'pp-sku':          { id: 'pp-sku', name: 'SKU', type: 'id', prefix: 'SKU-', autoIncrement: 301 },
    // ── created_time ──
    'pp-created':      { id: 'pp-created',     name: 'Created',          type: 'created_time' },
    // ── last_edited_time ──
    'pp-edited':       { id: 'pp-edited',      name: 'Last Edited',      type: 'last_edited_time' },
    // ── created_by ──
    'pp-created-by':   { id: 'pp-created-by',  name: 'Created By',       type: 'created_by' },
    // ── last_edited_by ──
    'pp-edited-by':    { id: 'pp-edited-by',   name: 'Edited By',        type: 'last_edited_by' },
    // ── assigned_to ──
    'pp-assigned':     { id: 'pp-assigned',    name: 'Assigned To',      type: 'assigned_to' },
    // ── due_date ──
    'pp-due':          { id: 'pp-due',         name: 'Due Date',         type: 'due_date' },
    // ── custom (database-engine int) ──
    'pp-stock-qty':    {
      id: 'pp-stock-qty', name: 'Stock Qty', type: 'custom',
      customConfig: { dataType: 'integer' },
    },
  },
};

// ─── Product Names — 30 per category × 10 = 300 ─────────────────────────────

const CATEGORY_PRODUCTS: string[][] = [
  // 0: Electronics (30)
  [
    'Wireless Noise-Canceling Headphones', 'Bluetooth Portable Speaker', 'Ultra HD 4K Monitor 27"',
    'Mechanical Gaming Keyboard', 'Ergonomic Wireless Mouse', 'USB-C Docking Station',
    'HD Webcam with Ring Light', 'Portable SSD 2TB', 'Smart Fitness Watch',
    'Adjustable Tablet Stand', 'Fast-Charge Power Bank 20K', 'True Wireless Earbuds',
    'Qi Wireless Charging Pad', 'HDMI to USB-C Adapter', 'Portable Bluetooth Tracker',
    'Smart Home Hub Mini', 'E-Ink Digital Notepad', 'UV-C Phone Sanitizer',
    'Mini Projector 1080p', 'Mesh WiFi Router System', 'Streaming Media Stick 4K',
    'Action Camera Waterproof', 'Solar Powered Charger 15W', 'Digital Voice Recorder',
    'Smart Light Bulb 4-Pack', 'Portable DAC Amp', 'Wireless Presentation Remote',
    'NAS Storage 4-Bay', 'Smart Doorbell Camera', 'RGB LED Strip 5m',
  ],
  // 1: Clothing (30)
  [
    'Classic Crew-Neck T-Shirt', 'Washed Denim Jacket', 'Lightweight Running Shoes',
    'Premium Cotton Hoodie', 'Slim Fit Chino Pants', 'Merino Wool Beanie',
    'Genuine Leather Belt', 'Performance Polo Shirt', 'Waterproof Rain Jacket',
    'Stretch Cargo Shorts', 'Silk Evening Scarf', 'Canvas Lace-Up Sneakers',
    'Down-Filled Winter Coat', 'Relaxed Linen Shirt', 'Fleece Quarter-Zip Vest',
    'Athletic Compression Tights', 'Cashmere V-Neck Sweater', 'Outdoor Hiking Boots',
    'Formal Oxford Dress Shoes', 'Bamboo Fiber Socks 6-Pack', 'Vintage Corduroy Blazer',
    'High-Waist Yoga Leggings', 'Packable Travel Jacket', 'Graphic Print Sweatshirt',
    'Linen Wide-Leg Trousers', 'Wool Fedora Hat', 'Leather Crossbody Bag',
    'UV Protection Rash Guard', 'Thermal Base Layer Set', 'Cotton Pajama Set',
  ],
  // 2: Home & Kitchen (30)
  [
    'Stainless Steel French Press', 'Non-Stick Ceramic Skillet 12"', 'Bamboo Cutting Board Set',
    'Digital Kitchen Scale', 'Silicone Baking Mat Set', 'Cast Iron Dutch Oven 6Qt',
    'Electric Milk Frother', 'Vacuum Insulated Tumbler', 'Compact Air Purifier',
    'Linen Table Runner', 'Smart LED Desk Lamp', 'Aromatherapy Diffuser',
    'Pour-Over Coffee Dripper', 'Glass Meal Prep Containers', 'Automatic Soap Dispenser',
    'Espresso Machine Semi-Auto', 'Temperature Control Kettle', 'Silicone Ice Cube Tray Set',
    'Magnetic Knife Strip Walnut', 'Compostable Dish Sponges 10-Pack', 'Robot Vacuum Lidar',
    'Weighted Throw Blanket 15lb', 'Ceramic Dinnerware Set 16pc', 'Cold Brew Maker 1.5L',
    'Under-Cabinet LED Strips', 'Cordless Handheld Vacuum', 'Memory Foam Bath Mat',
    'Wine Decanter Crystal', 'Electric Pepper Mill Set', 'Smart Indoor Garden Kit',
  ],
  // 3: Books & Media (30)
  [
    'The Art of Clean Code', 'Data Structures Illustrated', 'Creative Writing Masterclass',
    'Machine Learning Handbook', 'Modern UI Design Patterns', 'The Startup Playbook',
    'World History Atlas', 'Photography Composition Guide', 'Cooking Science Explained',
    'Financial Freedom Blueprint', 'Mindfulness & Meditation', 'The Climate Change Primer',
    'Digital Marketing Essentials', 'Quantum Physics for Beginners', 'Graphic Novel Collection Vol.1',
    'AI Ethics & Society', 'The Blockchain Bible', 'Japanese Woodworking Techniques',
    'Astronomy Visual Encyclopedia', 'Screenwriting Fundamentals', 'The Psychology of Habits',
    'Permaculture Design Manual', 'Watercolor Painting Basics', 'Music Theory Companion',
    'Cybersecurity Essentials', 'The Complete Wine Guide', 'Interior Design Sourcebook',
    'Advanced Yoga Poses', 'The Science of Sleep', 'Travel Photography Masterclass',
  ],
  // 4: Sports & Outdoors (30)
  [
    'Yoga Mat Premium 6mm', 'Adjustable Dumbbell Set', 'Resistance Band Kit 5-Pack',
    'Insulated Water Bottle 32oz', 'Camping Hammock with Straps', 'Trail Running Backpack 15L',
    'Cycling Gloves Gel-Padded', 'Swim Goggles Anti-Fog', 'Jump Rope Speed Wire',
    'Foam Roller Recovery 18"', 'Hiking Trekking Poles Pair', 'Tennis Racket Pro 280g',
    'Basketball Indoor/Outdoor', 'Fishing Tackle Box Compact', 'Climbing Chalk Bag',
    'GPS Running Watch', 'Kayak Paddle Carbon Fiber', 'Camping Stove Ultralight',
    'Boxing Gloves 12oz', 'Mountain Bike Helmet', 'Ski Goggles UV Protection',
    'Badminton Racket Set', 'Roller Skates Adult', 'Surfboard Shortboard 6\'2"',
    'Golf Putting Mat 10ft', 'Scuba Diving Mask', 'Slackline Kit 50ft',
    'Archery Target Stand', 'Snowshoes Aluminum', 'Ping Pong Table Foldable',
  ],
  // 5: Health & Beauty (30)
  [
    'Vitamin C Serum 30ml', 'Electric Toothbrush Sonic', 'Organic Shampoo Bar',
    'SPF 50 Mineral Sunscreen', 'Bamboo Hairbrush', 'Essential Oil Lavender Set',
    'Jade Facial Roller', 'Natural Deodorant Stick', 'Collagen Peptides Powder',
    'Stainless Steel Nail Kit', 'Lip Balm Variety 6-Pack', 'Reusable Cotton Rounds 12-Pack',
    'Aloe Vera Gel 250ml', 'Scalp Massager Brush', 'Teeth Whitening Strips 14-Day',
    'LED Face Mask Therapy', 'Biotin Hair Supplements 90ct', 'Micellar Cleansing Water',
    'Retinol Night Cream 50ml', 'Silk Pillowcase Pair', 'Electric Nail Drill Pro',
    'Activated Charcoal Mask', 'Probiotic Skincare Mist', 'Dry Body Brush Cedar',
    'Eye Cream Caffeine Boost', 'Hair Straightener Ceramic', 'Vitamin D3 Drops',
    'Aromatherapy Bath Salts', 'Eyelash Growth Serum', 'Beard Grooming Kit',
  ],
  // 6: Food & Grocery (30)
  [
    'Organic Dark Chocolate 85%', 'Cold Brew Coffee Concentrate', 'Mixed Nut Trail Mix 1lb',
    'Extra Virgin Olive Oil 500ml', 'Matcha Green Tea Powder', 'Raw Wildflower Honey 16oz',
    'Dried Mango Slices Unsweetened', 'Coconut Flour 2lb', 'Sriracha Hot Sauce 17oz',
    'Himalayan Pink Salt Grinder', 'Chia Seed Pudding Mix', 'Oat Milk Barista Blend 32oz',
    'Protein Bar Variety 12-Pack', 'Apple Cider Vinegar Raw', 'Freeze-Dried Strawberries',
    'Sourdough Bread Mix Kit', 'Truffle Infused Olive Oil', 'Quinoa Grain 3lb Bag',
    'Japanese Sencha Tea Bags 50ct', 'Almond Butter Smooth 16oz', 'Maple Syrup Grade A 12oz',
    'Smoked Paprika Organic', 'Espresso Coffee Beans 1kg', 'Vegan Jerky Sampler 6-Pack',
    'Tahini Paste Organic', 'Black Garlic Bulbs 3-Pack', 'Miso Paste White 500g',
    'Kombucha Starter Kit', 'Dried Porcini Mushrooms 2oz', 'Artisan Pasta Variety Box',
  ],
  // 7: Toys & Games (30)
  [
    'Wooden Building Blocks 100pc', 'Magnetic Tiles Play Set 60pc', 'STEM Robot Coding Kit',
    'Strategy Board Game Classic', 'RC Monster Truck 4WD', 'Art Supply Craft Kit Deluxe',
    'Science Experiment Set 30+', 'Puzzle 1000-Piece Landscape', 'Plush Teddy Bear Large',
    'Card Game Family Edition', 'Kinetic Sand Deluxe Set', 'Musical Instrument Starter Kit',
    'Outdoor Kite Diamond 48"', 'Marble Run Tower 120pc', 'Dollhouse Furniture Set 30pc',
    'Remote Control Drone Mini', 'Chemistry Lab Kit Kids', 'Foam Dart Blaster Pro',
    'Train Set Wooden 80pc', 'Magic Tricks Collection', 'Dinosaur Figurine Set 12pc',
    'Play Kitchen Accessories', 'Balance Bike Toddler', 'Rubik\'s Speed Cube',
    'Karaoke Machine Kids', 'Spy Gadget Detective Kit', 'Watercolor Paint Set 36',
    'RC Boat Speedster', 'Telescope Starter Kids', 'Giant Floor Puzzle Map',
  ],
  // 8: Tools & Hardware (30)
  [
    'Cordless Drill Driver 20V', 'Digital Multimeter', 'Socket Wrench Set 40pc',
    'Laser Level Self-Leveling', 'Workbench LED Light Bar', 'Precision Screwdriver Kit 60pc',
    'Pipe Wrench Heavy Duty 14"', 'Cordless Circular Saw 7"', 'Digital Caliper 6"',
    'Safety Glasses Clear Lens', 'Heat Gun Variable Speed', 'Tape Measure 25ft',
    'Hex Key Allen Set Metric', 'Wire Stripper Multi-Tool', 'Clamp Set 6-Piece',
    'Oscillating Multi-Tool', 'Bench Grinder 8-Inch', 'Soldering Station Digital',
    'Router Table Portable', 'Air Compressor 6-Gallon', 'Stud Finder Wall Scanner',
    'Impact Driver 20V Max', 'Workshop Dust Collector', 'Scroll Saw Variable Speed',
    'Welding Helmet Auto-Darken', 'Rivet Gun Heavy Duty', 'Magnetic Parts Tray',
    'Wood Chisel Set 6pc', 'Dremel Rotary Tool Kit', 'Workbench Vise 5-Inch',
  ],
  // 9: Garden & Outdoor (30)
  [
    'Raised Garden Bed Cedar', 'Solar String Lights 30ft', 'Garden Tool Set 5-Piece',
    'Compost Bin Tumbler 45gal', 'Drip Irrigation Starter Kit', 'Bird Feeder Squirrel-Proof',
    'Outdoor Patio Umbrella 9ft', 'Pruning Shears Bypass', 'Garden Kneeling Pad',
    'LED Pathway Lights 6-Pack', 'Plant Pot Set Ceramic 3pc', 'Lawn Sprinkler Oscillating',
    'Greenhouse Mini Portable', 'Hammock Stand Steel Frame', 'Rain Gauge Digital',
    'Outdoor Fire Pit 32-Inch', 'Pressure Washer Electric', 'Vertical Garden Planter',
    'Leaf Blower Cordless', 'Seed Starting Tray Set', 'Garden Arch Trellis Metal',
    'Pond Pump Solar Powered', 'Wheelbarrow Steel 6 Cu Ft', 'Chainsaw Battery 14"',
    'Outdoor Timer Smart Plug', 'Soil pH Meter Digital', 'Mosquito Trap UV Light',
    'Flagstone Stepping Stones 6pc', 'Outdoor Storage Box 120gal', 'Potting Bench Wood',
  ],
];

// ─── Warehouse locations with REAL lat/lng coordinates ───────────────────────

const WAREHOUSES: { address: string; lat: number; lng: number }[] = [
  { address: 'Sacramento, CA, USA',         lat: 38.5816,  lng: -121.4944 },
  { address: 'Newark, NJ, USA',             lat: 40.7357,  lng: -74.1724 },
  { address: 'Frankfurt, Germany',           lat: 50.1109,  lng: 8.6821 },
  { address: 'Tokyo, Japan',                 lat: 35.6762,  lng: 139.6503 },
  { address: 'Austin, TX, USA',             lat: 30.2672,  lng: -97.7431 },
  { address: 'London, United Kingdom',       lat: 51.5074,  lng: -0.1278 },
  { address: 'Sydney, Australia',            lat: -33.8688, lng: 151.2093 },
  { address: 'São Paulo, Brazil',           lat: -23.5505, lng: -46.6333 },
  { address: 'Mumbai, India',               lat: 19.0760,  lng: 72.8777 },
  { address: 'Toronto, Canada',             lat: 43.6532,  lng: -79.3832 },
  { address: 'Singapore',                    lat: 1.3521,   lng: 103.8198 },
  { address: 'Dubai, UAE',                  lat: 25.2048,  lng: 55.2708 },
  { address: 'Shanghai, China',             lat: 31.2304,  lng: 121.4737 },
  { address: 'Cape Town, South Africa',     lat: -33.9249, lng: 18.4241 },
  { address: 'Mexico City, Mexico',         lat: 19.4326,  lng: -99.1332 },
];

// ─── Origin country locations with real coords ──────────────────────────────

const ORIGINS: { address: string; lat: number; lng: number }[] = [
  { address: 'Shenzhen, China',       lat: 22.5431, lng: 114.0579 },
  { address: 'Dhaka, Bangladesh',     lat: 23.8103, lng: 90.4125 },
  { address: 'Milan, Italy',          lat: 45.4642, lng: 9.1900 },
  { address: 'Osaka, Japan',          lat: 34.6937, lng: 135.5023 },
  { address: 'Seoul, South Korea',    lat: 37.5665, lng: 126.9780 },
  { address: 'Ho Chi Minh, Vietnam',  lat: 10.8231, lng: 106.6297 },
  { address: 'Guadalajara, Mexico',   lat: 20.6597, lng: -103.3496 },
  { address: 'Berlin, Germany',       lat: 52.5200, lng: 13.4050 },
  { address: 'Istanbul, Turkey',      lat: 41.0082, lng: 28.9784 },
  { address: 'Portland, OR, USA',     lat: 45.5152, lng: -122.6784 },
];

// ─── Generation constants ────────────────────────────────────────────────────

const MANAGERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const BASE_PRICES = [149.99, 59.99, 39.99, 24.99, 44.99, 29.99, 12.99, 34.99, 59.99, 49.99];
const PRICE_MULT = [
  1.0, 0.6, 2.2, 0.8, 0.5, 1.4, 0.3, 1.8, 1.1, 0.7,
  0.9, 1.5, 0.4, 1.2, 0.65, 1.3, 0.55, 2.0, 0.75, 1.6,
  0.45, 1.7, 0.85, 1.15, 0.35, 1.9, 0.95, 0.5, 1.05, 0.72,
];
const STOCK_IDS = STOCK_OPTIONS.map(o => o.id);
const CONDITION_IDS = CONDITION_OPTIONS.map(o => o.id);
const RATING_IDS = RATING_OPTIONS.map(o => o.id);
const SHIPPING_IDS = SHIPPING_OPTIONS.map(o => o.id);
const BRAND_TAG_IDS = BRAND_TAG_OPTIONS.map(o => o.id);

// ─── Seeded PRNG for realistic data distributions ────────────────────────────
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
// Realistic weight distributions (NOT uniform)
const STOCK_WEIGHTS   = [45, 22, 12, 5, 16];    // In Stock heavy
const CONDITION_WEIGHTS = [58, 18, 8, 16];       // New dominant
const RATING_WEIGHTS  = [22, 38, 24, 11, 5];     // Bell-curve around 4★
const SHIPPING_WEIGHTS = [32, 28, 18, 10, 12];   // Free & Standard heavy
// Category popularity weights (uneven market share)
const CATEGORY_WEIGHTS = [18, 15, 13, 5, 10, 12, 7, 4, 9, 7]; // Electronics > Clothing > Home ...

function getTags(idx: number, catIdx: number): string[] {
  const tags: string[] = [];
  if (idx % 5 === 0) tags.push('ptag-prem');
  if ((catIdx === 5 || catIdx === 6 || catIdx === 9) && idx % 3 === 0) tags.push('ptag-org');
  if (idx % 11 === 0) tags.push('ptag-ltd');
  if (idx % 7 === 0) tags.push('ptag-best');
  if (idx % 13 === 0) tags.push('ptag-clear');
  if (idx > 240) tags.push('ptag-new');
  if ((catIdx === 6 || catIdx === 9) && idx % 4 === 0) tags.push('ptag-eco');
  if (catIdx === 7 && idx % 6 === 0) tags.push('ptag-hand');
  return tags.length > 0 ? tags : ['ptag-new'];
}

function getBrandTags(idx: number): string[] {
  const tags: string[] = [];
  if (idx % 12 === 0) tags.push('pbrd-lux');
  else if (idx % 8 === 0) tags.push('pbrd-des');
  else if (idx % 5 === 0) tags.push('pbrd-mid');
  else if (idx % 3 === 0) tags.push('pbrd-bud');
  else tags.push('pbrd-gen');
  if (idx % 15 === 0) tags.push('pbrd-ind');
  return tags;
}

const DESC_TEMPLATES = [
  'High-performance electronic device with premium build quality and cutting-edge technology.',
  'Stylish and comfortable apparel crafted from premium materials for everyday wear.',
  'Essential kitchen & home item designed for durability and modern aesthetics.',
  'Insightful reading material covering key topics with clear and engaging prose.',
  'Professional-grade sports equipment for training, competition, and outdoor adventures.',
  'Premium beauty and wellness product made with natural, skin-friendly ingredients.',
  'Carefully sourced gourmet food item — fresh, flavorful, and sustainably produced.',
  'Fun and educational toy that sparks creativity and keeps the whole family entertained.',
  'Durable professional-grade tool built for precision and reliability on every job.',
  'Beautiful outdoor & garden essential for transforming your green spaces.',
];

const NOTES_TEMPLATES = [
  'Restock by Q2. Supplier confirmed pricing for next batch.',
  'Top performer in monthly sales report. Consider expanding SKUs.',
  'Quality inspection passed. Minor packaging update planned.',
  'Customer feedback positive — 4.5+ avg rating on storefront.',
  'Seasonal item — plan markdowns after peak season.',
  'New supplier evaluated. Cost reduction potential ~15%.',
  'Warranty claim rate under 2%. Excellent durability metrics.',
  'Cross-sell opportunity with related accessories.',
  'Photography needed for updated product listing.',
  'Competitor analysis complete — pricing is competitive.',
];

const VENDORS = [
  'techsupply.com', 'fabricworld.com', 'homegoods.co', 'bookdist.com', 'sportsgear.io',
  'beautyline.co', 'freshfoods.com', 'toyland.co', 'toolpro.com', 'greengarden.co',
];

// ─── Generate all 300 pages ──────────────────────────────────────────────────

function generateProductPages(): Record<string, Page> {
  const pages: Record<string, Page> = {};
  let globalIdx = 0;

  CATEGORY_PRODUCTS.forEach((products, catIdx) => {
    products.forEach((name, itemIdx) => {
      globalIdx++;
      const id = `pd${globalIdx}`;
      // Seeded PRNG per product → deterministic but varied
      const rng = mulberry32(globalIdx * 7919 + catIdx * 104729 + itemIdx * 49157);
      // Weighted random category reassignment: 60% keep natural, 40% redistribute
      const keepNatural = rng() < 0.6;
      const catId = keepNatural
        ? CATEGORY_OPTIONS[catIdx].id
        : weightedPick(CATEGORY_OPTIONS.map(o => o.id), CATEGORY_WEIGHTS, rng);
      const price = Math.round(BASE_PRICES[catIdx] * PRICE_MULT[itemIdx % PRICE_MULT.length] * 100) / 100;
      const cost = Math.round(price * (0.35 + (globalIdx % 30) * 0.01) * 100) / 100;
      const weight = Math.round((0.1 + (globalIdx % 50) * 0.15) * 100) / 100;
      const stockId = weightedPick(STOCK_IDS, STOCK_WEIGHTS, rng);
      const conditionId = weightedPick(CONDITION_IDS, CONDITION_WEIGHTS, rng);
      const ratingId = weightedPick(RATING_IDS, RATING_WEIGHTS, rng);
      const shippingId = weightedPick(SHIPPING_IDS, SHIPPING_WEIGHTS, rng);
      const managerIdx = globalIdx % MANAGERS.length;
      const reviewerIdx = (globalIdx + 3) % MANAGERS.length;
      const warehouseIdx = globalIdx % WAREHOUSES.length;
      const originIdx = globalIdx % ORIGINS.length;
      const daysAgo = -600 + globalIdx * 2; // spread over ~600 days

      const wh = WAREHOUSES[warehouseIdx];
      const orig = ORIGINS[originIdx];

      pages[id] = {
        id,
        databaseId: DB_PRODUCTS,
        properties: {
          'pp-name':        name,
          'pp-desc':        DESC_TEMPLATES[catIdx],
          'pp-notes':       NOTES_TEMPLATES[globalIdx % NOTES_TEMPLATES.length],
          'pp-price':       price,
          'pp-cost':        cost,
          'pp-weight':      weight,
          'pp-category':    catId,
          'pp-condition':   conditionId,
          'pp-rating':      ratingId,
          'pp-shipping':    shippingId,
          'pp-tags':        getTags(globalIdx, catIdx),
          'pp-brand-tags':  getBrandTags(globalIdx),
          'pp-stock':       stockId,
          'pp-release':     _d(daysAgo),
          'pp-warranty-exp': _d(daysAgo + 365),
          'pp-featured':    globalIdx % 5 === 0,
          'pp-returnable':  globalIdx % 3 !== 0,
          'pp-manager':     MANAGERS[managerIdx],
          'pp-reviewer':    MANAGERS[reviewerIdx],
          'pp-url':         `https://shop.example.com/product/${globalIdx}`,
          'pp-manual-url':  globalIdx % 4 === 0 ? `https://docs.example.com/manual/${globalIdx}` : '',
          'pp-email':       `vendor${(catIdx + 1)}@${VENDORS[catIdx]}`,
          'pp-phone':       `+1-555-${String(2000 + globalIdx).padStart(4, '0')}`,
          'pp-warehouse':   { address: `${wh.address}, Aisle ${(itemIdx % 8) + 1}`, lat: wh.lat + (itemIdx * 0.003 - 0.04), lng: wh.lng + (itemIdx * 0.004 - 0.05) },
          'pp-origin':      { address: orig.address, lat: orig.lat, lng: orig.lng },
          'pp-sku':         `SKU-${globalIdx}`,
          'pp-related':     globalIdx % 10 === 0 ? ['i1', 'i3'] : globalIdx % 7 === 0 ? ['i2'] : [],
          'pp-assigned':    globalIdx % 3 === 0 ? [MANAGERS[managerIdx]] : [MANAGERS[managerIdx], MANAGERS[reviewerIdx]],
          'pp-due':         _d(daysAgo + 30 + (globalIdx % 14) * 7),
          'pp-stock-qty':   Math.floor(10 + rng() * 490),
        },
        content: globalIdx <= 5 ? [{ id: `bpd${globalIdx}`, type: 'paragraph', content: `Detailed product page for ${name}. Features premium materials and excellent customer reviews.` }] : [],
        createdAt: _d(daysAgo - 10),
        updatedAt: _d(daysAgo + Math.floor(Math.random() * 20)),
        createdBy: MANAGERS[managerIdx],
        lastEditedBy: MANAGERS[reviewerIdx],
      };
    });
  });

  return pages;
}

export const productPages = generateProductPages();

// ─── Views (all 10 types + 2nd dashboard) ────────────────────────────────────

export const productViews: Record<string, ViewConfig> = {
  'v-prod-table': {
    id: 'v-prod-table', databaseId: DB_PRODUCTS, name: 'All Products', type: 'table',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'pp-name', 'pp-category', 'pp-price', 'pp-cost', 'pp-margin', 'pp-margin-pct', 'pp-price-tier',
      'pp-weight-label', 'pp-days-listed', 'pp-warranty-ok', 'pp-profit-score', 'pp-inv-value',
      'pp-is-bargain', 'pp-price-per-kg', 'pp-deal-tag',
      'pp-stock', 'pp-tags', 'pp-condition', 'pp-rating', 'pp-shipping', 'pp-featured', 'pp-returnable',
      'pp-release', 'pp-due', 'pp-assigned', 'pp-manager', 'pp-sku', 'pp-warehouse', 'pp-weight',
      'pp-stock-qty', 'pp-related', 'pp-asset-count',
    ],
    settings: { showVerticalLines: true },
  },
  'v-prod-board': {
    id: 'v-prod-board', databaseId: DB_PRODUCTS, name: 'Stock Board', type: 'board',
    filters: [], filterConjunction: 'and', sorts: [],
    grouping: { propertyId: 'pp-stock' },
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-tags', 'pp-featured', 'pp-rating'],
    settings: { colorColumns: true, cardSize: 'medium' },
  },
  'v-prod-gallery': {
    id: 'v-prod-gallery', databaseId: DB_PRODUCTS, name: 'Gallery', type: 'gallery',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-stock', 'pp-rating', 'pp-condition'],
    settings: { cardSize: 'medium', cardPreview: 'none' },
  },
  'v-prod-list': {
    id: 'v-prod-list', databaseId: DB_PRODUCTS, name: 'List by Category', type: 'list',
    filters: [], filterConjunction: 'and', sorts: [],
    grouping: { propertyId: 'pp-category' },
    visibleProperties: ['pp-name', 'pp-price', 'pp-stock', 'pp-manager', 'pp-release', 'pp-rating'],
    settings: { showPageIcon: true },
  },
  'v-prod-calendar': {
    id: 'v-prod-calendar', databaseId: DB_PRODUCTS, name: 'Release Calendar', type: 'calendar',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-stock', 'pp-category'],
    settings: { showWeekends: true, showCalendarAs: 'month', showCalendarBy: 'pp-release' },
  },
  'v-prod-timeline': {
    id: 'v-prod-timeline', databaseId: DB_PRODUCTS, name: 'Timeline', type: 'timeline',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-stock', 'pp-category', 'pp-price'],
    settings: { showTable: true, zoomLevel: 'month', showTimelineBy: 'pp-release' },
  },
  'v-prod-chart': {
    id: 'v-prod-chart', databaseId: DB_PRODUCTS, name: 'Price by Category', type: 'chart',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price'],
    settings: { chartType: 'vertical_bar', xAxisProperty: 'pp-category', yAxisProperty: 'pp-price', yAxisAggregation: 'average', colorPalette: 'default' },
  },
  'v-prod-feed': {
    id: 'v-prod-feed', databaseId: DB_PRODUCTS, name: 'Feed', type: 'feed',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-desc', 'pp-category', 'pp-price', 'pp-stock', 'pp-tags', 'pp-rating'],
    settings: {},
  },
  'v-prod-map': {
    id: 'v-prod-map', databaseId: DB_PRODUCTS, name: 'Warehouse Map', type: 'map',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-warehouse', 'pp-category', 'pp-stock'],
    settings: { mapBy: 'pp-warehouse' },
  },
  'v-prod-dashboard': {
    id: 'v-prod-dashboard', databaseId: DB_PRODUCTS, name: 'Overview Dashboard', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-stock', 'pp-featured'],
    settings: {
      widgets: [
        { id: 'w1', type: 'stat', title: 'Total Products', aggregation: 'count', width: 1, height: 1 },
        { id: 'w2', type: 'stat', title: 'Avg Price', propertyId: 'pp-price', aggregation: 'average', width: 1, height: 1 },
        { id: 'w3', type: 'stat', title: 'Total Revenue', propertyId: 'pp-price', aggregation: 'sum', width: 1, height: 1 },
        { id: 'w4', type: 'stat', title: 'Featured Count', propertyId: 'pp-featured', aggregation: 'count', width: 1, height: 1 },
        { id: 'w5', type: 'chart', title: 'Category Distribution', propertyId: 'pp-category', chartStyle: 'stacked_bar', aggregation: 'count', width: 4, height: 1 },
        { id: 'w6', type: 'chart', title: 'By Category', propertyId: 'pp-category', chartStyle: 'donut', aggregation: 'count', width: 2, height: 2 },
        { id: 'w7', type: 'chart', title: 'Shipping Methods', propertyId: 'pp-shipping', chartStyle: 'horizontal_bar', aggregation: 'count', width: 2, height: 2 },
        { id: 'w8', type: 'chart', title: 'Category Trends', propertyId: 'pp-category', chartStyle: 'multi_line', aggregation: 'count', width: 4, height: 2 },
        { id: 'w9', type: 'table', title: 'Top Products', propertyId: 'pp-price', width: 2, height: 2 },
        { id: 'w10', type: 'list', title: 'Recent Activity', width: 2, height: 2 },
      ],
    },
  },
  'v-prod-analytics': {
    id: 'v-prod-analytics', databaseId: DB_PRODUCTS, name: 'Analytics Dashboard', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-cost', 'pp-stock', 'pp-rating', 'pp-shipping', 'pp-condition', 'pp-weight'],
    settings: {
      widgets: [
        { id: 'wa1', type: 'stat', title: 'Total Revenue', propertyId: 'pp-price', aggregation: 'sum', width: 1, height: 1 },
        { id: 'wa2', type: 'stat', title: 'Avg Cost', propertyId: 'pp-cost', aggregation: 'average', width: 1, height: 1 },
        { id: 'wa3', type: 'stat', title: 'Avg Weight', propertyId: 'pp-weight', aggregation: 'average', width: 1, height: 1 },
        { id: 'wa4', type: 'stat', title: 'Products', aggregation: 'count', width: 1, height: 1 },
        { id: 'wa5', type: 'chart', title: 'Category Breakdown', propertyId: 'pp-category', chartStyle: 'bar', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa6', type: 'chart', title: 'Shipping Analysis', propertyId: 'pp-shipping', chartStyle: 'donut', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa7', type: 'chart', title: 'Condition Overview', propertyId: 'pp-condition', chartStyle: 'progress', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa8', type: 'chart', title: 'Category Trend', propertyId: 'pp-category', chartStyle: 'area', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa8b', type: 'chart', title: 'Stock × Category Over Time', propertyId: 'pp-stock', chartStyle: 'multi_line', aggregation: 'count', width: 4, height: 2 },
        { id: 'wa9', type: 'chart', title: 'Price Metrics', propertyId: 'pp-price', chartStyle: 'number_grid', aggregation: 'sum', width: 2, height: 1 },
        { id: 'wa10', type: 'chart', title: 'Cost Metrics', propertyId: 'pp-cost', chartStyle: 'number_grid', aggregation: 'sum', width: 2, height: 1 },
        { id: 'wa11', type: 'chart', title: 'Condition Split', propertyId: 'pp-condition', chartStyle: 'stacked_bar', aggregation: 'count', width: 2, height: 1 },
        { id: 'wa12', type: 'chart', title: 'Shipping Distribution', propertyId: 'pp-shipping', chartStyle: 'horizontal_bar', aggregation: 'count', width: 2, height: 1 },
        { id: 'wa13', type: 'table', title: 'Price Rankings', propertyId: 'pp-price', width: 2, height: 2 },
        { id: 'wa14', type: 'list', title: 'Recent Activity', width: 2, height: 2 },
      ],
    },
  },
  'v-prod-formula-dash': {
    id: 'v-prod-formula-dash', databaseId: DB_PRODUCTS, name: 'Formula Analytics', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'pp-name', 'pp-price', 'pp-cost', 'pp-margin', 'pp-margin-pct', 'pp-price-tier',
      'pp-weight-label', 'pp-days-listed', 'pp-warranty-ok', 'pp-profit-score',
      'pp-inv-value', 'pp-is-bargain', 'pp-price-per-kg', 'pp-deal-tag',
    ],
    settings: {
      formulaAnalytics: true,
    },
  },
};
