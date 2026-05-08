export const nationalities = [
  { code: 'ae', flag: '🇦🇪', name: 'Emirati' },
  { code: 'sa', flag: '🇸🇦', name: 'Saudi' },
  { code: 'in', flag: '🇮🇳', name: 'Indian' },
  { code: 'pk', flag: '🇵🇰', name: 'Pakistani' },
  { code: 'ph', flag: '🇵🇭', name: 'Filipino' },
  { code: 'eg', flag: '🇪🇬', name: 'Egyptian' },
  { code: 'lb', flag: '🇱🇧', name: 'Lebanese' },
  { code: 'jo', flag: '🇯🇴', name: 'Jordanian' },
  { code: 'gb', flag: '🇬🇧', name: 'British' },
  { code: 'us', flag: '🇺🇸', name: 'American' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'cn', flag: '🇨🇳', name: 'Chinese' },
  { code: 'kr', flag: '🇰🇷', name: 'Korean' },
  { code: 'au', flag: '🇦🇺', name: 'Australian' },
  { code: 'jp', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ca', flag: '🇨🇦', name: 'Canadian' },
];

export const menuData = [
  {
    id: "classic",
    name: "Classic",
    icon: "☕",
    items: [
      { id: "espresso", name: "Espresso", price: 19.00 },
      { id: "long-black", name: "Long Black", price: 21.00 },
      { id: "macchiato", name: "Macchiato", price: 21.00 },
      { id: "flat-white", name: "Flat White", price: 24.00 },
      { id: "cortado", name: "Cortado", price: 21.00 },
      { id: "cappuccino", name: "Cappuccino", price: 24.00 },
      { id: "latte", name: "Latte", price: 24.00 },
      { id: "mocha", name: "Mocha", price: 25.00 },
      { id: "spanish", name: "Spanish Latte", price: 31.00 },
    ],
  },
  {
    id: "signature",
    name: "Signature Latte",
    icon: "✨",
    items: [
      { id: "arabic-latte", name: "Arabic Latte", price: 39.00 },
      { id: "spice-latte", name: "Spice Latte", price: 39.00 },
    ],
  },
  {
    id: "matcha",
    name: "Matcha",
    icon: "🍵",
    items: [
      { id: "matcha-classic", name: "Matcha", price: 31.00 },
      { id: "mango-coconut", name: "Mango Coconut Matcha", price: 39.00 },
      { id: "strawberry-pomegranate", name: "Strawberry Pomegranate Matcha", price: 39.00 },
      { id: "blueberry-cheesecake", name: "Blueberry Cheesecake Matcha", price: 39.00 },
    ],
  },
  {
    id: "smoothie",
    name: "Smoothie",
    icon: "🥤",
    items: [
      { id: "strawberry-collagen", name: "Strawberry Collagen", price: 60.00 },
      { id: "almond-date", name: "Almond Date Power", price: 55.00 },
      { id: "acai", name: "Acai Smoothie", price: 47.00 },
    ],
  },
  {
    id: "food",
    name: "Food",
    icon: "🥪",
    items: [
      { id: "yogurt-bowl", name: "Yoghurt Granola Swirl", price: 42.00 },
      { id: "turkey-avocado", name: "Turkey and Avocado Sandwich", price: 42.00 },
      { id: "tuna-avocado", name: "Tuna and Avocado Sandwich", price: 42.00 },
      { id: "chicken-caesar", name: "Chicken Caesar Sandwich", price: 42.00 },
      { id: "egg-breakfast", name: "Egg Breakfast Sandwich", price: 42.00 },
      { id: "halloumi", name: "Halloumi Sandwich", price: 42.00 },
    ],
  },
];

export const productQuestions = [
  {
    id: 'temperature_right',
    text: 'When your order arrived — was it the right temperature?',
    emoji: '🌡️',
    rightLabel: 'Yes, perfect',
    leftLabel: 'Not quite',
  },
  {
    id: 'busyness',
    text: 'How busy was it when you visited?',
    emoji: '👥',
    rightLabel: 'Busy & buzzing',
    leftLabel: 'Quiet & calm',
  },
  {
    id: 'worth_price',
    text: 'Was it worth the price?',
    emoji: '💰',
    rightLabel: 'Absolutely',
    leftLabel: 'A bit pricey',
  },
];

export const waitFeelingLabels = [
  { position: 0, emoji: '⚡', label: 'Quick' },
  { position: 33, emoji: '😊', label: 'Normal' },
  { position: 66, emoji: '😐', label: 'A bit slow' },
  { position: 100, emoji: '😕', label: 'Too long' },
];

export const vibeCards = [
  { id: 'cozy', emoji: '☕', label: 'Cozy corner', frequency: 261.63 },
  { id: 'work', emoji: '💼', label: 'Work-friendly', frequency: 293.66 },
  { id: 'instagram', emoji: '📸', label: 'Instagram-worthy', frequency: 329.63 },
  { id: 'quiet', emoji: '🤫', label: 'Quiet & calm', frequency: 349.23 },
  { id: 'music', emoji: '🎵', label: 'Good music', frequency: 392.0 },
  { id: 'energizing', emoji: '⚡', label: 'Energizing', frequency: 440.0 },
  { id: 'cool', emoji: '❄️', label: 'Cool & refreshing', frequency: 493.88 },
  { id: 'social', emoji: '👥', label: 'Social & buzzing', frequency: 523.25 },
];

