/**
 * Internationalization (i18n) system for 9Yards Kiosk
 * Supports English (en) and Luganda (lg)
 */

export type Language = 'en' | 'lg';

export interface TranslationKeys {
  // Common
  'common.appName': string;
  'common.tagline': string;
  'common.loading': string;
  'common.error': string;
  'common.retry': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.back': string;
  'common.next': string;
  'common.skip': string;
  'common.done': string;
  'common.save': string;
  'common.close': string;
  'common.search': string;
  'common.free': string;
  'common.required': string;
  'common.optional': string;
  
  // Welcome page
  'welcome.title': string;
  'welcome.subtitle': string;
  'welcome.startOrder': string;
  'welcome.trackOrder': string;
  'welcome.viewBoard': string;
  'welcome.tapAnywhere': string;
  'welcome.poweredBy': string;
  'welcome.wereOpen': string;
  'welcome.tapToBegin': string;
  
  // Menu
  'menu.title': string;
  'menu.allItems': string;
  'menu.buildCombo': string;
  'menu.buildYourMeal': string;
  'menu.addToOrder': string;
  'menu.startCombo': string;
  'menu.popular': string;
  'menu.new': string;
  'menu.soldOut': string;
  'menu.unavailable': string;
  'menu.searchPlaceholder': string;
  'menu.noResults': string;
  'menu.itemsInCategory': string;
  
  // Categories
  'category.all': string;
  'category.mainDishes': string;
  'category.sauces': string;
  'category.sideDishes': string;
  'category.lusaniya': string;
  'category.juices': string;
  'category.desserts': string;
  
  // Combo Builder
  'combo.title': string;
  'combo.step1Title': string;
  'combo.step1Desc': string;
  'combo.step2Title': string;
  'combo.step2Desc': string;
  'combo.step3Title': string;
  'combo.step3Desc': string;
  'combo.step4Title': string;
  'combo.step4Desc': string;
  'combo.step5Title': string;
  'combo.step5Desc': string;
  'combo.selectPreparation': string;
  'combo.selectSize': string;
  'combo.selectedItems': string;
  'combo.runningTotal': string;
  'combo.addToCart': string;
  'combo.updateCart': string;
  'combo.editSelection': string;
  'combo.includedFree': string;
  
  // Cart
  'cart.title': string;
  'cart.empty': string;
  'cart.emptyDesc': string;
  'cart.browseMenu': string;
  'cart.subtotal': string;
  'cart.total': string;
  'cart.items': string;
  'cart.item': string;
  'cart.addMore': string;
  'cart.checkout': string;
  'cart.remove': string;
  'cart.edit': string;
  'cart.combo': string;
  'cart.with': string;
  'cart.clearCart': string;
  'cart.clearConfirm': string;
  
  // Details / Checkout
  'details.title': string;
  'details.yourInfo': string;
  'details.name': string;
  'details.namePlaceholder': string;
  'details.phone': string;
  'details.phonePlaceholder': string;
  'details.phoneHint': string;
  'details.location': string;
  'details.locationPlaceholder': string;
  'details.locationHint': string;
  'details.specialInstructions': string;
  'details.specialInstructionsPlaceholder': string;
  'details.paymentMethod': string;
  'details.payAtCounter': string;
  'details.payAtCounterDesc': string;
  'details.cash': string;
  'details.cashDesc': string;
  'details.mobileMoney': string;
  'details.mobileMoneyDesc': string;
  'details.continue': string;
  'details.phoneRequired': string;
  'details.phoneOptional': string;
  
  // Payment
  'payment.title': string;
  'payment.review': string;
  'payment.placeOrder': string;
  'payment.processing': string;
  'payment.momoPrompt': string;
  'payment.momoWaiting': string;
  'payment.momoApprove': string;
  'payment.success': string;
  'payment.failed': string;
  'payment.tryAgain': string;
  'payment.changeMethod': string;
  
  // Confirmation
  'confirmation.title': string;
  'confirmation.orderPlaced': string;
  'confirmation.orderNumber': string;
  'confirmation.saveNumber': string;
  'confirmation.estimatedWait': string;
  'confirmation.minutes': string;
  'confirmation.ordersAhead': string;
  'confirmation.trackOrder': string;
  'confirmation.newOrder': string;
  'confirmation.autoReset': string;
  'confirmation.whatsappNotify': string;
  
  // Order Tracking
  'tracking.title': string;
  'tracking.preparing': string;
  'tracking.ready': string;
  'tracking.delivered': string;
  'tracking.enterNumber': string;
  'tracking.lookup': string;
  'tracking.notFound': string;
  'tracking.status': string;
  'tracking.timeline': string;
  'tracking.placedAt': string;
  'tracking.startedAt': string;
  'tracking.readyAt': string;
  'tracking.deliveredAt': string;
  'tracking.liveUpdates': string;
  
  // Order Board
  'board.title': string;
  'board.preparingColumn': string;
  'board.readyColumn': string;
  'board.noOrders': string;
  
  // Inactivity
  'inactivity.title': string;
  'inactivity.stillThere': string;
  'inactivity.tapToContinue': string;
  'inactivity.continue': string;
  'inactivity.startOver': string;
  'inactivity.returning': string;
  'inactivity.resettingIn': string;
  'inactivity.seconds': string;
  
  // Errors
  'error.generic': string;
  'error.network': string;
  'error.orderFailed': string;
  'error.paymentFailed': string;
  'error.invalidPhone': string;
  'error.requiredField': string;
}

const translations: Record<Language, TranslationKeys> = {
  en: {
    // Common
    'common.appName': '9Yards Food',
    'common.tagline': 'Fresh Ugandan cuisine, made with love',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try Again',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.skip': 'Skip',
    'common.done': 'Done',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.free': 'FREE',
    'common.required': 'Required',
    'common.optional': 'Optional',
    
    // Welcome page
    'welcome.title': '9Yards Food',
    'welcome.subtitle': 'Order fresh Ugandan meals, ready in minutes',
    'welcome.startOrder': 'Place Your Order',
    'welcome.trackOrder': 'Find My Order',
    'welcome.viewBoard': 'Live Orders',
    'welcome.tapAnywhere': 'Touch anywhere to begin',
    'welcome.poweredBy': 'Powered by 9Yards',
    'welcome.wereOpen': "We're Open!",
    'welcome.tapToBegin': 'Tap to begin',
    
    // Menu
    'menu.title': 'Our Menu',
    'menu.allItems': 'All Items',
    'menu.buildCombo': 'Build Your Combo',
    'menu.buildYourMeal': 'Create your perfect meal',
    'menu.addToOrder': 'Add to Order',
    'menu.startCombo': 'Start Combo',
    'menu.popular': 'Popular',
    'menu.new': 'New',
    'menu.soldOut': 'Sold Out',
    'menu.unavailable': 'Unavailable',
    'menu.searchPlaceholder': 'Search menu...',
    'menu.noResults': 'No items found',
    'menu.itemsInCategory': 'items',
    
    // Categories
    'category.all': 'All',
    'category.mainDishes': 'Main Dishes',
    'category.sauces': 'Sauces',
    'category.sideDishes': 'Side Dishes',
    'category.lusaniya': 'Lusaniya',
    'category.juices': 'Juices',
    'category.desserts': 'Desserts',
    
    // Combo Builder
    'combo.title': 'Build Your Combo',
    'combo.step1Title': 'Choose Your Food',
    'combo.step1Desc': 'Select your main dishes (included free)',
    'combo.step2Title': 'Choose Your Sauce',
    'combo.step2Desc': 'Pick your protein - this sets your combo price',
    'combo.step3Title': 'Choose Side Dish',
    'combo.step3Desc': 'Add a free side to complete your meal',
    'combo.step4Title': 'Add Extras',
    'combo.step4Desc': 'Optional drinks and snacks',
    'combo.step5Title': 'Review Order',
    'combo.step5Desc': 'Check your selections before adding to cart',
    'combo.selectPreparation': 'How would you like it prepared?',
    'combo.selectSize': 'Select portion size',
    'combo.selectedItems': 'Selected Items',
    'combo.runningTotal': 'Running Total',
    'combo.addToCart': 'Add to Cart',
    'combo.updateCart': 'Update Cart',
    'combo.editSelection': 'Edit',
    'combo.includedFree': 'Included FREE',
    
    // Cart
    'cart.title': 'Your Order',
    'cart.empty': 'Your cart is empty',
    'cart.emptyDesc': 'Add some delicious food to get started',
    'cart.browseMenu': 'Browse Menu',
    'cart.subtotal': 'Subtotal',
    'cart.total': 'Total',
    'cart.items': 'items',
    'cart.item': 'item',
    'cart.addMore': 'Add More',
    'cart.checkout': 'Checkout',
    'cart.remove': 'Remove',
    'cart.edit': 'Edit',
    'cart.combo': 'Combo',
    'cart.with': 'with',
    'cart.clearCart': 'Clear Cart',
    'cart.clearConfirm': 'Are you sure you want to remove all items?',
    
    // Details
    'details.title': 'Your Details',
    'details.yourInfo': 'Enter your information',
    'details.name': 'Your Name',
    'details.namePlaceholder': 'Enter your name',
    'details.phone': 'Phone Number',
    'details.phonePlaceholder': '07XX XXX XXX',
    'details.phoneHint': 'For order updates via WhatsApp',
    'details.location': 'Desk / Location',
    'details.locationPlaceholder': 'e.g., 2nd Floor, Desk 12',
    'details.locationHint': 'Where should we find you?',
    'details.specialInstructions': 'Special Instructions',
    'details.specialInstructionsPlaceholder': 'Any allergies or special requests?',
    'details.paymentMethod': 'Payment Method',
    'details.payAtCounter': 'Pay at Counter',
    'details.payAtCounterDesc': 'Pay when you pick up your order',
    'details.cash': 'Cash',
    'details.cashDesc': 'Pay with cash on delivery',
    'details.mobileMoney': 'Mobile Money',
    'details.mobileMoneyDesc': 'MTN MoMo or Airtel Money',
    'details.continue': 'Continue to Payment',
    'details.phoneRequired': 'Phone number is required for Mobile Money',
    'details.phoneOptional': 'Phone number (optional for updates)',
    
    // Payment
    'payment.title': 'Payment',
    'payment.review': 'Review Your Order',
    'payment.placeOrder': 'Place Order',
    'payment.processing': 'Processing...',
    'payment.momoPrompt': 'Enter your Mobile Money number',
    'payment.momoWaiting': 'Check Your Phone',
    'payment.momoApprove': 'Approve the transaction on your phone',
    'payment.success': 'Payment Received!',
    'payment.failed': 'Payment Failed',
    'payment.tryAgain': 'Try Again',
    'payment.changeMethod': 'Change Method',
    
    // Confirmation
    'confirmation.title': 'Order Confirmed!',
    'confirmation.orderPlaced': 'Your order has been placed',
    'confirmation.orderNumber': 'Order Number',
    'confirmation.saveNumber': 'Save or photo this number for pickup',
    'confirmation.estimatedWait': 'Estimated wait time',
    'confirmation.minutes': 'minutes',
    'confirmation.ordersAhead': 'orders ahead of you',
    'confirmation.trackOrder': 'Track Order',
    'confirmation.newOrder': 'Start New Order',
    'confirmation.autoReset': 'Screen will reset in',
    'confirmation.whatsappNotify': "We'll notify you on WhatsApp when ready",
    
    // Order Tracking
    'tracking.title': 'Track Your Order',
    'tracking.preparing': 'Preparing',
    'tracking.ready': 'Ready for Pickup',
    'tracking.delivered': 'Delivered',
    'tracking.enterNumber': 'Enter your order number',
    'tracking.lookup': 'Look Up Order',
    'tracking.notFound': 'Order not found',
    'tracking.status': 'Order Status',
    'tracking.timeline': 'Timeline',
    'tracking.placedAt': 'Order Placed',
    'tracking.startedAt': 'Started Preparing',
    'tracking.readyAt': 'Ready for Pickup',
    'tracking.deliveredAt': 'Delivered',
    'tracking.liveUpdates': 'Live updates enabled',
    
    // Order Board
    'board.title': 'Order Board',
    'board.preparingColumn': 'Now Preparing',
    'board.readyColumn': 'Ready for Pickup',
    'board.noOrders': 'No orders at the moment',
    
    // Inactivity
    'inactivity.stillThere': 'Still there?',
    'inactivity.tapToContinue': 'Tap anywhere to continue',
    'inactivity.resettingIn': 'Resetting in',
    'inactivity.seconds': 'seconds',
    'inactivity.title': 'Still there?',
    'inactivity.continue': 'Continue Order',
    'inactivity.startOver': 'Start Over',
    'inactivity.returning': 'Returning to start in',
    
    // Errors
    'error.generic': 'Something went wrong. Please try again.',
    'error.network': 'Network error. Please check your connection.',
    'error.orderFailed': 'Failed to place order. Please try again.',
    'error.paymentFailed': 'Payment failed. Please try again.',
    'error.invalidPhone': 'Please enter a valid Ugandan phone number',
    'error.requiredField': 'This field is required',
  },
  
  lg: {
    // Common
    'common.appName': '9Yards Food',
    'common.tagline': 'Emmere ennungi eya Uganda',
    'common.loading': 'Lindako...',
    'common.error': 'Waliwo ekikyamu',
    'common.retry': 'Gezaako nate',
    'common.cancel': 'Sazaamu',
    'common.confirm': 'Kakasa',
    'common.back': 'Emabega',
    'common.next': 'Ekiddako',
    'common.skip': 'Buuka',
    'common.done': 'Weddeko',
    'common.save': 'Tereka',
    'common.close': 'Ggalawo',
    'common.search': 'Noonya',
    'common.free': 'BWEREERE',
    'common.required': 'Kyetaagibwa',
    'common.optional': 'Kyeyagalidde',
    
    // Welcome page
    'welcome.title': '9Yards Food',
    'welcome.subtitle': 'Funa emmere ennungi eya Uganda, eneetegekebwa mangu',
    'welcome.startOrder': 'Teekawo Order Yo',
    'welcome.trackOrder': 'Zuula Order Yange',
    'welcome.viewBoard': 'Orders Eziriwo',
    'welcome.tapAnywhere': 'Koma wonna okutandika',
    'welcome.poweredBy': 'Eteekebwawo 9Yards',
    'welcome.wereOpen': 'Tuli Bbawo!',
    'welcome.tapToBegin': 'Koma okutandika',
    
    // Menu
    'menu.title': 'Menu Yaffe',
    'menu.allItems': 'Byonna',
    'menu.buildCombo': 'Zimba Combo Yo',
    'menu.buildYourMeal': 'Kola emmere yo ng\'oyagala',
    'menu.addToOrder': 'Ggyako ku Order',
    'menu.startCombo': 'Tandika Combo',
    'menu.popular': 'Ekyagalibwa',
    'menu.new': 'Ekipya',
    'menu.soldOut': 'Kiwedde',
    'menu.unavailable': 'Tekiriwo',
    'menu.searchPlaceholder': 'Noonya emmere...',
    'menu.noResults': 'Tewali kilabise',
    'menu.itemsInCategory': 'ebintu',
    
    // Categories
    'category.all': 'Byonna',
    'category.mainDishes': 'Emmere Enkulu',
    'category.sauces': 'Enva',
    'category.sideDishes': 'Ebyongerwako',
    'category.lusaniya': 'Lusaniya',
    'category.juices': 'Amazzi g\'ebibala',
    'category.desserts': 'Ebinyebwa',
    
    // Combo Builder
    'combo.title': 'Zimba Combo Yo',
    'combo.step1Title': 'Londa Emmere',
    'combo.step1Desc': 'Londa emmere yo enkulu (ya bwereere)',
    'combo.step2Title': 'Londa Enva',
    'combo.step2Desc': 'Londa ennyama yo - eno esalawo omuwendo',
    'combo.step3Title': 'Londa Ekyongerwako',
    'combo.step3Desc': 'Ggyako ekyongerwako ekya bwereere',
    'combo.step4Title': 'Byongera',
    'combo.step4Desc': 'Ebyokunywa n\'ebikalu',
    'combo.step5Title': 'Kebera Order',
    'combo.step5Desc': 'Kebera bye walondeddeko',
    'combo.selectPreparation': 'Oyagala kifumbibwe otya?',
    'combo.selectSize': 'Londa obunene',
    'combo.selectedItems': 'By\'olondeddeko',
    'combo.runningTotal': 'Omuwendo Gwonna',
    'combo.addToCart': 'Tekawo mu Cart',
    'combo.updateCart': 'Kyuusa Cart',
    'combo.editSelection': 'Kyuusa',
    'combo.includedFree': 'Muli BWEREERE',
    
    // Cart
    'cart.title': 'Order Yo',
    'cart.empty': 'Cart yo njereere',
    'cart.emptyDesc': 'Ggyako emmere ennungi okutandika',
    'cart.browseMenu': 'Laba Menu',
    'cart.subtotal': 'Omuwendo',
    'cart.total': 'Omuwendo Gwonna',
    'cart.items': 'ebintu',
    'cart.item': 'ekintu',
    'cart.addMore': 'Ggyako Ebirala',
    'cart.checkout': 'Sasula',
    'cart.remove': 'Gyawo',
    'cart.edit': 'Kyuusa',
    'cart.combo': 'Combo',
    'cart.with': 'ne',
    'cart.clearCart': 'Jjamu Cart',
    'cart.clearConfirm': 'Okakasa oyagala okuggyawo byonna?',
    
    // Details
    'details.title': 'Ebikukwatako',
    'details.yourInfo': 'Wandiika ebikukwatako',
    'details.name': 'Erinnya Lyo',
    'details.namePlaceholder': 'Wandiika erinnya lyo',
    'details.phone': 'Ennamba y\'Essimu',
    'details.phonePlaceholder': '07XX XXX XXX',
    'details.phoneHint': 'Tukumanyise ku WhatsApp',
    'details.location': 'Gy\'oli',
    'details.locationPlaceholder': 'e.g., Waggulu owaakabiri, Desk 12',
    'details.locationHint': 'Tukuzeemu wa?',
    'details.specialInstructions': 'Ebiragiro Eby\'enjawulo',
    'details.specialInstructionsPlaceholder': 'Waliwo allergy oba ekyo kirimu ky\'otayagala?',
    'details.paymentMethod': 'Enkola y\'Okusasula',
    'details.payAtCounter': 'Sasula ku Counter',
    'details.payAtCounterDesc': 'Sasula bw\'onotwala order yo',
    'details.cash': 'Ssente',
    'details.cashDesc': 'Sasula ne ssente',
    'details.mobileMoney': 'Mobile Money',
    'details.mobileMoneyDesc': 'MTN MoMo oba Airtel Money',
    'details.continue': 'Weyongerayo Okusasula',
    'details.phoneRequired': 'Ennamba y\'essimu yeetaagibwa ku Mobile Money',
    'details.phoneOptional': 'Ennamba y\'essimu (si ya buwaze)',
    
    // Payment
    'payment.title': 'Okusasula',
    'payment.review': 'Kebera Order Yo',
    'payment.placeOrder': 'Tekawo Order',
    'payment.processing': 'Kitambuzibwa...',
    'payment.momoPrompt': 'Wandiika ennamba ya Mobile Money',
    'payment.momoWaiting': 'Laba Essimu Yo',
    'payment.momoApprove': 'Kakasa ku ssimu yo',
    'payment.success': 'Ssente Zifunye!',
    'payment.failed': 'Okusasula Kugazze',
    'payment.tryAgain': 'Gezaako Nate',
    'payment.changeMethod': 'Kyuusa Enkola',
    
    // Confirmation
    'confirmation.title': 'Order Ekakasiddwa!',
    'confirmation.orderPlaced': 'Order yo eteekeddwawo',
    'confirmation.orderNumber': 'Ennamba y\'Order',
    'confirmation.saveNumber': 'Tereka ennamba eno okuggyako order yo',
    'confirmation.estimatedWait': 'Budde bw\'olindirira',
    'confirmation.minutes': 'eddakiika',
    'confirmation.ordersAhead': 'orders mu maso gwo',
    'confirmation.trackOrder': 'Goberera Order',
    'confirmation.newOrder': 'Tandika Order Empya',
    'confirmation.autoReset': 'Ekifo kiddamu mu',
    'confirmation.whatsappNotify': 'Tujja kukumanyisa ku WhatsApp bw\'enoba yeetegese',
    
    // Order Tracking
    'tracking.title': 'Goberera Order Yo',
    'tracking.preparing': 'Efumbibwa',
    'tracking.ready': 'Yeetegese Okutwazibwa',
    'tracking.delivered': 'Yutwaddwa',
    'tracking.enterNumber': 'Wandiika ennamba y\'order yo',
    'tracking.lookup': 'Noonya Order',
    'tracking.notFound': 'Order terabika',
    'tracking.status': 'Embeera y\'Order',
    'tracking.timeline': 'Obudde',
    'tracking.placedAt': 'Order Yateekeddwawo',
    'tracking.startedAt': 'Yatandika Okufumbibwa',
    'tracking.readyAt': 'Yeetegese',
    'tracking.deliveredAt': 'Yatwaliddwa',
    'tracking.liveUpdates': 'Ebipya birabika',
    
    // Order Board
    'board.title': 'Order Board',
    'board.preparingColumn': 'Zifumbibwa Kati',
    'board.readyColumn': 'Zeetegese',
    'board.noOrders': 'Tewali orders kati',
    
    // Inactivity
    'inactivity.stillThere': 'Okyaliwo?',
    'inactivity.tapToContinue': 'Koma wonna okuwangaala',
    'inactivity.resettingIn': 'Kiddamu mu',
    'inactivity.seconds': 'sekondi',
    'inactivity.title': 'Okyaliwo?',
    'inactivity.continue': 'Weyongerayo n\'Order',
    'inactivity.startOver': 'Tandika Buggya',
    'inactivity.returning': 'Giddayo mu',
    
    // Errors
    'error.generic': 'Waliwo ekikyamu. Gezaako nate.',
    'error.network': 'Kizibu ky\'enternet. Kebera connection yo.',
    'error.orderFailed': 'Order tegenze bulungi. Gezaako nate.',
    'error.paymentFailed': 'Okusasula kugazze. Gezaako nate.',
    'error.invalidPhone': 'Wandiika ennamba y\'essimu entuufu',
    'error.requiredField': 'Kino kyetaagibwa',
  },
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('kiosk-language', lang);
  }
}

export function getLanguage(): Language {
  if (typeof sessionStorage !== 'undefined') {
    const saved = sessionStorage.getItem('kiosk-language') as Language | null;
    if (saved && (saved === 'en' || saved === 'lg')) {
      currentLanguage = saved;
    }
  }
  return currentLanguage;
}

export function t(key: keyof TranslationKeys): string {
  const lang = getLanguage();
  return translations[lang][key] || translations['en'][key] || key;
}

export function getTranslations(): TranslationKeys {
  return translations[getLanguage()];
}

export function getCategoryName(slug: string): string {
  const categoryMap: Record<string, keyof TranslationKeys> = {
    'main-dishes': 'category.mainDishes',
    'sauces': 'category.sauces',
    'side-dishes': 'category.sideDishes',
    'lusaniya': 'category.lusaniya',
    'juices': 'category.juices',
    'desserts': 'category.desserts',
  };
  const key = categoryMap[slug];
  return key ? t(key) : slug;
}
