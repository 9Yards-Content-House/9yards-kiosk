/**
 * Translation strings for 9Yards Kiosk
 * English only (language switching has been removed)
 */

export type Language = 'en';

export interface TranslationKeys {
  // Common
  'common.appName': string;
  'common.tagline': string;
  'common.loading': string;
  'common.error': string;
  'common.retry': string;
  'language.en': string;
  'language.lg': string;
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
  'welcome.greeting.morning': string;
  'welcome.greeting.afternoon': string;
  'welcome.greeting.evening': string;
  'welcome.subtitle': string;
  'welcome.startOrder': string;
  'welcome.trackOrder': string;
  'welcome.viewQueue': string;
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
  'confirmation.scanQR': string;
  'confirmation.scanPhone': string;
  'confirmation.receiveUpdates': string;
  'confirmation.cancelOrder': string;
  'confirmation.cancelHint': string;
  
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
  'tracking.enterHint': string;
  'tracking.notFoundDesc': string;
  'tracking.tryAgain': string;
  'tracking.readyPickup': string;
  'tracking.readyDesc': string;
  'tracking.searchAnother': string;
  'tracking.yourItems': string;
  'tracking.placeOrder': string;
  'tracking.cancelled': string;
  'tracking.emptyState': string;
  'tracking.outForDelivery': string;
  
  // Order Board
  'board.title': string;
  'board.preparingColumn': string;
  'board.readyColumn': string;
  'board.noOrders': string;
  
  // Queue Display
  'queue.title': string;
  'queue.loading': string;
  'queue.backToOrder': string;
  'queue.orders': string;
  'queue.order': string;
  'queue.noOrders': string;
  'queue.justNow': string;
  'queue.min': string;
  'queue.mins': string;
  'queue.ordersInQueue': string;
  'queue.autoRefreshing': string;
  
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
  
  // Network Status
  'network.offline': string;
  'network.online': string;
  
  // Feedback
  'feedback.howWasYourMeal': string;
  'feedback.leaveFeedback': string;
  'feedback.title': string;
  'feedback.thankYou': string;
}

const translations: { en: TranslationKeys } = {
  en: {
    // Common
    'common.appName': '9Yards Food',
    'common.tagline': 'Fresh Ugandan cuisine, made with love',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try Again',
    'language.en': 'English',
    'language.lg': 'Luganda',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.skip': 'Skip',
    'common.done': 'Done',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.add': 'Add',
    'common.free': 'FREE',
    'common.required': 'Required',
    'common.optional': 'Optional',
    
    // Welcome page
    'welcome.greeting.morning': 'Good Morning',
    'welcome.greeting.afternoon': 'Good Afternoon',
    'welcome.greeting.evening': 'Good Evening',
    'welcome.subtitle': 'Fresh Ugandan Meals. Ready in Minutes.',
    'welcome.startOrder': 'Start Order',
    'welcome.trackOrder': 'Track My Order',
    'welcome.viewQueue': 'View Order Queue',
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
    'combo.step1Desc': 'Select your main dishes',
    'combo.step2Title': 'Choose Your Sauce',
    'combo.step2Desc': 'Pick your protein - this sets your combo price',
    'combo.step3Title': 'Choose Side Dish',
    'combo.step3Desc': 'Add a free side to complete your meal',
    'combo.step4Title': 'Add Extras',
    'combo.step4Desc': 'Optional drinks and snacks',
    'combo.step5Title': 'Review Order',
    'combo.step5Desc': 'Check your selections before adding to cart',
    'combo.selectPreparation': 'How would you like it prepared?',
    'combo.selectSize': 'How many of this combo?',
    'combo.quantityLabel': 'Quantity',
    'combo.selectedItems': 'Selected Items',
    'combo.runningTotal': 'Running Total',
    'combo.addToCart': 'Added to Order',
    'combo.updateCart': 'Update Cart',
    'combo.editSelection': 'Edit',
    'combo.includedFree': 'Included',
    
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
    'confirmation.scanQR': 'Scan the QR code below to track on your phone',
    'confirmation.scanPhone': 'Scan with your phone to track your order',
    'confirmation.receiveUpdates': "You'll receive updates when your order is ready",
    'confirmation.cancelOrder': 'Cancel Order',
    'confirmation.cancelHint': 'You can cancel before preparation begins',
    
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
    'tracking.liveUpdates': 'Live updates',
    'tracking.enterHint': 'Enter the 4-digit number on your receipt',
    'tracking.notFoundDesc': 'We could not find that order. Please check the number on your receipt and try again.',
    'tracking.tryAgain': 'Try Again',
    'tracking.readyPickup': 'Your order is ready!',
    'tracking.readyDesc': 'Please come to the counter to collect your food.',
    'tracking.searchAnother': 'Search Another Order',
    'tracking.yourItems': 'Your Items',
    'tracking.placeOrder': 'Place New Order',
    'tracking.cancelled': 'Cancelled',
    'tracking.emptyState': 'Enter your order number to see its status',
    'tracking.outForDelivery': 'Out for Delivery',
    
    // Order Board
    'board.title': 'Order Board',
    'board.preparingColumn': 'Now Preparing',
    'board.readyColumn': 'Ready for Pickup',
    'board.noOrders': 'No orders at the moment',
    
    // Queue Display
    'queue.title': 'Order Queue',
    'queue.loading': 'Loading queue...',
    'queue.backToOrder': 'Back to Order',
    'queue.orders': 'orders',
    'queue.order': 'order',
    'queue.noOrders': 'No orders',
    'queue.justNow': 'Just now',
    'queue.min': '1 min',
    'queue.mins': 'mins',
    'queue.ordersInQueue': 'orders in queue',
    'queue.autoRefreshing': 'Auto-refreshing',
    
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
    
    // Network Status
    'network.offline': 'You are offline. Orders will be saved and synced when connection returns.',
    'network.online': 'Connection restored!',
    
    // Feedback
    'feedback.howWasYourMeal': 'How was your meal? We\'d love your feedback!',
    'feedback.leaveFeedback': 'Leave Feedback',
    'feedback.title': 'Rate Your Experience',
    'feedback.thankYou': 'Thank you for your feedback!',
  },
};

// English-only - language switching has been removed
export function setLanguage(_lang: Language): void {
  // No-op - language switching removed
}

export function getLanguage(): Language {
  return 'en';
}

export function t(key: keyof TranslationKeys): string {
  return translations['en'][key] || key;
}

export function getTranslations(): TranslationKeys {
  return translations['en'];
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
