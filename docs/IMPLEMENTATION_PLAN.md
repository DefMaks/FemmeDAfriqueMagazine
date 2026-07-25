# Implementation Plan - Phase 2

## Summary of Completed Work

✅ **Database Schema Created** (`supabase/migrations/20251018140000_create_wallets_transactions.sql`)
- Profiles table (device-based authentication)
- Wallets table with auto-generated addresses (FDA-XXXXXXXX)
- Transactions table with automatic balance updates
- Purchased magazines tracking
- 2% commission calculation for Defmaks revenue

✅ **Payment Service Created** (`src/services/paymentService.ts`)
- TwigaPaie integration (e-money payments)
- Wallet management (create, get balance, transactions)
- Magazine purchase tracking
- Transaction history

✅ **API Extensions** (`src/services/api.ts`)
- Ad endpoints (app-ad, app_ad_zone)
- Search functionality
- Slider tag support

## Remaining Tasks

### 1. HomeScreen Redesign
**Status:** TODO
**Priority:** HIGH

**Requirements:**
- À LA UNE section: 4 posts from tag "slider" in a carousel/slider
- Section: Espace Tendresse (sliding cards)
- Section: Ad Area (app ads)
- Section: Entrepreneuriat (list view)
- Section: Gastronomie (list view)

**Components to Create:**
- `PostSlider.tsx` - Horizontal slider for featured posts
- `SectionHeader.tsx` - Reusable section title component
- `AdBanner.tsx` - Ad display component

**Tag IDs:**
- slider: (need to find tag ID from WordPress)
- Espace Tendresse: Category 2483
- Entrepreneuriat: Category 115
- Gastronomie: Category 20

### 2. DiscoverScreen Update
**Status:** TODO
**Priority:** MEDIUM

**Requirements:**
- Change category grid from current layout to 2 per line
- Larger cards for better visibility

**File to Modify:**
- `src/screens/DiscoverScreen.tsx`

### 3. Shop Button Emphasis
**Status:** TODO
**Priority:** HIGH

**Requirements:**
- Make Shop tab stand out visually (larger icon, badge, special color)
- ShopScreen background should be black
- This is the main monetization feature

**Files to Modify:**
- `src/navigation/RootNavigator.tsx` - Tab bar styling
- `src/screens/ShopScreen.tsx` - Black theme

### 4. Search Implementation
**Status:** TODO
**Priority:** HIGH

**Requirements:**
- Global search functionality
- Search bar in DiscoverScreen (already exists, needs wiring)
- Display search results
- Search history (optional)

**Components to Create:**
- `SearchResults.tsx` - Display search results

### 5. Post Share & Comments
**Status:** TODO
**Priority:** MEDIUM

**Share:**
- Share button already exists in ArticleDetailScreen
- Needs testing

**Comments:**
- WordPress native comments endpoint: `/wp/v2/comments`
- Display comments in ArticleDetailScreen
- Add comment form

**Components to Create:**
- `CommentsList.tsx`
- `CommentForm.tsx`

### 6. FDA Logo Integration
**Status:** TODO
**Priority:** MEDIUM

**File Location:**
- `/tmp/cc-agent/58850351/project/assets/fda.png`

**Where to Display:**
- HomeScreen header (replace or alongside current logo)
- ShopScreen header
- Splash screen (optional)

### 7. WordPress Popular Posts Algorithm
**Status:** TODO
**Priority:** MEDIUM

**Requirements:**
- Remove Supabase tracking from popular posts
- Use WordPress native post views/popularity
- Document WordPress implementation

**Action:**
- Delete migration: `supabase/migrations/20251018133000_create_post_views_table.sql`
- Remove `postViewsService` from `src/services/supabaseService.ts`
- Create WordPress PHP code documentation

### 8. Checkout Flow Enhancement
**Status:** TODO
**Priority:** HIGH

**Requirements:**
- After successful payment, show download button
- Update database (wallet + transaction + purchased_magazines)
- Display purchase confirmation

**Files to Modify:**
- `src/screens/CheckoutScreen.tsx`

**Flow:**
1. User initiates payment via TwigaPaie
2. Poll payment status
3. On success:
   - Create/update wallet
   - Record transaction
   - Record magazine purchase
   - Show download button

### 9. PayPal Integration
**Status:** TODO
**Priority:** LOW (implement after TwigaPaie works)

**Requirements from Developer:**
For PayPal integration, I'll need:
1. **PayPal Client ID** (from PayPal Developer Dashboard)
2. **PayPal Secret Key** (from PayPal Developer Dashboard)
3. **Environment** - Sandbox or Production?
4. **Accepted currencies** - USD only or multiple?
5. **Webhook URL** for payment confirmation

**Implementation:**
- Use `@paypal/react-native-paypal` or web checkout
- Create `paypalService.ts` similar to twigaPaieService
- Add PayPal option in CheckoutScreen

**Flow Already Set Up:**
```typescript
// Payment option selector
<TouchableOpacity onPress={() => setPaymentMethod('twigapaie')}>
  <Text>Mobile Money (TwigaPaie)</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => setPaymentMethod('paypal')}>
  <Text>PayPal</Text>
</TouchableOpacity>

// Process based on selection
if (paymentMethod === 'paypal') {
  await processPayPalPayment();
}
```

## Priority Order

1. **HIGH** - HomeScreen redesign (slider, sections)
2. **HIGH** - Shop button emphasis + ShopScreen styling
3. **HIGH** - Checkout flow with download button
4. **HIGH** - Search implementation
5. **MEDIUM** - DiscoverScreen 2-column layout
6. **MEDIUM** - FDA logo integration
7. **MEDIUM** - Comments system
8. **MEDIUM** - WordPress popular posts docs
9. **LOW** - PayPal integration

## Database Schema Reference

### Profiles Table
```sql
id: uuid (PK)
device_id: text (unique)
email: text
phone: text
```

### Wallets Table
```sql
id: uuid (PK)
profile_id: uuid (FK -> profiles)
wallet_address: text (auto: "FDA-XXXXXXXX")
balance_cdf: numeric(15,2)
balance_usd: numeric(15,2)
```

### Transactions Table
```sql
id: uuid (PK)
WALLET_ID: uuid (FK -> wallets)
amount: numeric(15,2)
currency: enum (CDF, USD, XOF)
transaction_type: enum (DEPOSIT, WITHDRAWAL, PURCHASE)
description: text
external_reference: text (TwigaPaie order_id)
defmaks_revenue_cdf: numeric(15,2) [auto: 2%]
defmaks_revenue_usd: numeric(15,2) [auto: 2%]
```

### Purchased Magazines Table
```sql
id: uuid (PK)
profile_id: uuid (FK -> profiles)
magazine_id: text (WordPress magazine ID)
transaction_id: uuid (FK -> transactions)
purchase_date: timestamptz
```

## Next Steps

Run the migration:
```bash
# The migration file is ready at:
# supabase/migrations/20251018140000_create_wallets_transactions.sql
```

Then continue with HomeScreen implementation.

## Notes

- All Supabase integration is ready
- TwigaPaie service is implemented
- PayPal needs additional configuration from client
- WordPress endpoints are documented
- All TypeScript types are defined
