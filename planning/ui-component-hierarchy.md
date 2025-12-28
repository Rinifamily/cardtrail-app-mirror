# CardTrail UI Component Hierarchy

**Document Version:** 2.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** UI/UX & Frontend Team

**📖 Also see:** [frontend-architecture.md](frontend-architecture.md) for shadcn/ui + DaisyUI patterns

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Navigation Structure](#navigation-structure)
3. [Page Hierarchy](#page-hierarchy)
4. [Component Tree](#component-tree)
5. [Reusable Components](#reusable-components)
6. [Responsive Design](#responsive-design)
7. [Component Props & Interfaces](#component-props--interfaces)
8. [State Management](#state-management)

---

## Overview

### Design System

**UI Framework:**
- **Foundation**: shadcn/ui (Radix UI primitives + Tailwind)
- **Enhancement**: DaisyUI (pre-styled Tailwind components)
- **Why?** Zero-runtime, full customization, 30+ themes
- **📖 Details:** See [frontend-architecture.md](frontend-architecture.md) for complete comparison

**Mobile-First Approach:**
- Design for 375px width first (iPhone SE)
- Scale up to tablet (768px) and desktop (1024px+)
- Touch-friendly interactions (44px minimum tap target)
- Bottom-heavy navigation (thumb zone)

**Visual Language:**
- **Colors:** Blue primary (#3b82f6), Gray neutral (#6b7280)
- **Typography:** System fonts (SF Pro on iOS, Roboto on Android)
- **Spacing:** 4px base unit (4, 8, 16, 24, 32, 48, 64)
- **Shadows:** Subtle elevation (0-4 levels)
- **Animations:** Smooth transitions (200-300ms)

**Accessibility:**
- WCAG 2.1 AA compliance
- Semantic HTML
- ARIA labels for screen readers
- Keyboard navigation
- Color contrast ≥4.5:1

---

## Navigation Structure

### Bottom Navigation (Mobile)

**5 Primary Tabs:**

```
┌─────────────────────────────────────────┐
│                                         │
│          Main Content Area              │
│                                         │
│                                         │
└─────────────────────────────────────────┘
┌───────┬───────┬───────┬───────┬───────┐
│ 📈    │ 💼    │ 🔍    │ 🏆    │ 👤    │
│ 大盘   │ 持仓   │ 搜卡   │ 榜单   │ 我的   │
│Market │Collect│Search │Ranking│Profile│
└───────┴───────┴───────┴───────┴───────┘
```

**Tab Configuration:**

| Icon | Label (CN) | Label (EN) | Route | Authentication |
|------|-----------|-----------|-------|----------------|
| 📈 TrendingUp | 大盘 | Market | `/market` | Public |
| 💼 Briefcase | 持仓 | Collection | `/collection` | Required |
| 🔍 Search | 搜卡 | Search | `/search` | Public |
| 🏆 Trophy | 榜单 | Rankings | `/rankings` | Public |
| 👤 User | 我的 | Profile | `/profile` | Required |

---

### Top Navigation (Desktop)

**Header Layout:**

```
┌────────────────────────────────────────────────────────┐
│ [Logo] CardTrail    [Search Bar]    [Login] [Sign Up] │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ 大盘 | 持仓 | 搜卡 | 榜单 | 我的                          │
└────────────────────────────────────────────────────────┘
```

---

## Page Hierarchy

### L1, L2, L3 Page Levels

**L1:** Top-level pages (accessible from bottom nav)  
**L2:** Category/list pages  
**L3:** Detail pages (deepest level)

---

### 1. Market Module (大盘)

```
L1: /market (MarketOverview)
    ├── CTIIndexCard
    ├── KLineChart
    ├── SubIndicesGrid
    │   ├── WOTCIndexCard
    │   ├── ModernIndexCard
    │   ├── JapaneseIndexCard
    │   └── EnglishIndexCard
    ├── MarketNewsCarousel
    └── QuickActionsBar

L2: /market/[index_type] (IndexDetail)
    ├── IndexHeader
    ├── DetailedChart
    ├── ConstituentCardsList
    └── ComparisonView

L3: (none - redirects to card profile)
```

**Key Components:**

#### CTIIndexCard
```tsx
interface CTIIndexCardProps {
  index: MarketIndex;
  compact?: boolean;
}

// Displays:
// - Index value (large number)
// - Change % (colored: green/red)
// - Sparkline chart (trend)
// - Last updated timestamp
```

#### KLineChart
```tsx
interface KLineChartProps {
  data: MarketIndexHistory[];
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  height?: number;
}

// Features:
// - Line or candlestick chart (Recharts)
// - Period selector (1D, 1W, 1M, 3M, 6M, 1Y)
// - Hover tooltip
// - Zoom and pan (desktop)
```

---

### 2. Collection Module (持仓)

```
L1: /collection (CollectionOverview)
    ├── PortfolioSummaryCard
    │   ├── TotalValueDisplay
    │   ├── ProfitLossDisplay
    │   └── ROIDisplay
    ├── FilterBar (sort, filter)
    ├── CollectionList
    │   └── CollectionItem (repeating)
    └── EmptyState (if no collection)

L2: /collection/add (AddCollectionForm)
    └── (Modal or full page)

L3: /collection/[id] (CollectionItemDetail)
    ├── CardDisplay
    ├── PurchaseInfoSection
    ├── CurrentValueSection
    ├── ProfitLossSection
    ├── NotesSection
    └── ActionButtons (Edit, Delete)

L2: /collection/analytics (CollectionAnalytics)
    ├── PortfolioValueChart (line chart)
    ├── DistributionCharts (pie charts)
    │   ├── ByRarityChart
    │   ├── BySetChart
    │   └── ByGradeChart
    └── TopMoversTable
```

**Key Components:**

#### PortfolioSummaryCard
```tsx
interface PortfolioSummaryCardProps {
  summary: PortfolioSummary;
  loading?: boolean;
}

// Displays:
// - Total cards count
// - Total invested (¥)
// - Current value (¥)
// - Profit/loss (¥ and %)
// - Distribution sparklines
```

#### CollectionItem
```tsx
interface CollectionItemProps {
  collection: Collection;
  card: Card;
  onEdit: () => void;
  onDelete: () => void;
}

// Displays:
// - Card thumbnail
// - Card name + set
// - Quantity x Grade
// - Purchase price vs Current value
// - P/L badge (colored)
// - Action menu (3-dot)
```

---

### 3. Search Module (搜卡)

```
L1: /search (SearchLanding)
    ├── SearchBar (with autocomplete)
    ├── FilterBar
    │   ├── LanguageFilter
    │   ├── RarityFilter
    │   └── SetFilter
    ├── HotSearches (trending keywords)
    └── RecentSearches (localStorage)

L2: /search/results (SearchResults)
    ├── SearchHeader (query, result count)
    ├── SortControls
    ├── FilterSidebar (desktop)
    ├── CardGrid
    │   └── CardGridItem (repeating)
    └── Pagination

L3: /search/cards/[id] (CardProfile) ⭐ MOST CRITICAL
    ├── CardHero
    │   ├── CardImageViewer
    │   │   ├── MainImage (zoomable)
    │   │   └── ImageCarousel (variants)
    │   └── CardBasicInfo
    │       ├── CardName (h1)
    │       ├── SetInfo
    │       └── RarityBadge
    ├── CTPriceSection
    │   ├── CTPriceDisplay (large)
    │   ├── GradingTabs (PSA 10/9/8, Raw)
    │   └── PriceConfidenceBadge
    ├── PriceTrendChart
    │   ├── ChartCanvas (Recharts)
    │   ├── PeriodSelector
    │   └── ChartTooltip
    ├── SalesHistoryTable
    │   └── SalesHistoryRow (repeating)
    ├── CardDetailsSection
    │   ├── CardStats (HP, Type, etc.)
    │   └── MarketStats (volume, popularity)
    └── ActionButtons
        ├── AddToCollectionButton
        └── AddToWatchlistButton
```

**Key Components:**

#### SearchBar with Autocomplete
```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

// Features:
// - Debounced input (300ms)
// - Autocomplete dropdown
// - Keyboard navigation (up/down, enter, esc)
// - Clear button
// - Loading spinner
```

#### CardProfile (Complete Component Tree)
```tsx
// app/(main)/search/cards/[id]/page.tsx
<CardProfile>
  <div className="grid md:grid-cols-2 gap-8">
    {/* Left Column: Images */}
    <CardImageViewer
      images={card.image_urls}
      cardName={card.name}
    >
      <ZoomableImage />
      <ImageThumbnails />
    </CardImageViewer>

    {/* Right Column: Info & Actions */}
    <div>
      <CardHeader
        name={card.name}
        number={card.number}
        set={card.set}
        rarity={card.rarity}
      />

      <CTPriceDisplay
        price={card.current_price_psa10}
        confidence={priceData.confidence}
        sampleSize={priceData.sample_size}
        lastUpdated={card.price_updated_at}
      />

      <GradingTabs
        cardId={card.id}
        activeGrade="psa10"
        onGradeChange={handleGradeChange}
      >
        <TabButton grade="PSA 10" />
        <TabButton grade="PSA 9" />
        <TabButton grade="PSA 8" />
        <TabButton grade="Raw" />
      </GradingTabs>

      <ActionButtons>
        <AddToCollectionButton card={card} />
        <AddToWatchlistButton card={card} />
        <ShareButton card={card} />
      </ActionButtons>
    </div>
  </div>

  {/* Full-width sections below */}
  <PriceTrendChart
    cardId={card.id}
    grade={selectedGrade}
    period={selectedPeriod}
  >
    <PeriodSelector periods={['1W', '1M', '3M', '6M', '1Y', 'ALL']} />
    <ChartCanvas data={priceHistory} />
    <ChartLegend />
  </PriceTrendChart>

  <SalesHistoryTable
    cardId={card.id}
    grade={selectedGrade}
  >
    <TableHeader />
    <TableBody>
      {transactions.map((tx) => (
        <SalesHistoryRow key={tx.id} transaction={tx} />
      ))}
    </TableBody>
    <TablePagination />
  </SalesHistoryTable>

  <CardDetailsSection
    card={card}
    stats={cardStats}
  >
    <DetailsGrid>
      <DetailItem label="HP" value={card.hp} />
      <DetailItem label="Type" value={card.type} />
      <DetailItem label="Rarity" value={card.rarity} />
      <DetailItem label="Set" value={card.set?.name} />
      <DetailItem label="Language" value={card.language} />
      <DetailItem label="Popularity" value={card.popularity_score} />
    </DetailsGrid>
  </CardDetailsSection>
</CardProfile>
```

---

### 4. Rankings Module (榜单)

```
L1: /rankings (RankingsPage)
    ├── RankingsTabs
    │   ├── TopRisersTab
    │   ├── TopFallersTab
    │   ├── MostTradedTab
    │   └── NewListingsTab
    ├── FilterBar
    │   ├── PeriodSelector (1D, 7D, 30D)
    │   ├── LanguageFilter
    │   └── GradeFilter
    ├── RankingsTable
    │   └── RankingRow (repeating)
    └── Pagination

L3: (links to CardProfile)
```

**Key Components:**

#### RankingsTable
```tsx
interface RankingsTableProps {
  rankings: Ranking[];
  type: 'risers' | 'fallers' | 'volume';
}

// Displays:
// - Rank number (1-100)
// - Card thumbnail + name
// - Current price
// - Change % (colored: green/red)
// - Change amount (Δ)
// - Sparkline (trend)
```

---

### 5. Profile Module (我的)

```
L1: /profile (ProfileOverview)
    ├── ProfileHeader
    │   ├── Avatar
    │   ├── Username
    │   ├── Bio
    │   └── EditButton
    ├── StatsCards
    │   ├── CollectionSizeCard
    │   ├── PortfolioValueCard
    │   └── MemberSinceCard
    ├── QuickLinks
    │   ├── WatchlistLink
    │   ├── SettingsLink
    │   └── LogoutButton
    └── RecentActivity
        └── ActivityItem (repeating)

L2: /profile/watchlist (WatchlistPage)
    ├── WatchlistHeader
    ├── FilterBar
    ├── WatchlistGrid
    │   └── WatchlistItem (repeating)
    └── EmptyState

L2: /profile/settings (SettingsPage)
    ├── SettingsTabs
    │   ├── DisplayTab
    │   ├── NotificationsTab
    │   ├── PrivacyTab
    │   └── AccountTab
    └── SettingsForm
        ├── CurrencySelect
        ├── LanguageSelect
        ├── ThemeSelect
        ├── NotificationToggles
        └── SaveButton

L2: /profile/edit (EditProfilePage)
    └── EditProfileForm
        ├── AvatarUpload
        ├── UsernameInput
        ├── BioTextarea
        ├── LocationInput
        ├── WebsiteInput
        └── SaveButton
```

**Key Components:**

#### WatchlistItem
```tsx
interface WatchlistItemProps {
  watchlist: Watchlist;
  card: Card;
  currentPrice: number;
  onRemove: () => void;
}

// Displays:
// - Card thumbnail
// - Card name
// - Target price vs Current price
// - Alert badge (if triggered)
// - Remove button
```

---

## Component Tree

### Complete Application Hierarchy

```
App (Root)
├── Providers
│   ├── QueryClientProvider (React Query)
│   ├── AuthProvider (Supabase Auth)
│   └── ToastProvider (Notifications)
│
├── RootLayout
│   ├── <html>
│   ├── <head> (metadata, fonts)
│   └── <body>
│       ├── {children}
│       └── Toaster
│
├── AuthLayout (for /login, /signup)
│   ├── AuthCard
│   │   ├── Logo
│   │   ├── AuthForm
│   │   └── AuthFooter
│   └── Background (decorative)
│
└── MainLayout (for authenticated routes)
    ├── Header (desktop only)
    │   ├── Logo
    │   ├── SearchBar (global)
    │   ├── Navigation Links
    │   └── UserMenu
    │       ├── Avatar
    │       └── Dropdown
    │           ├── ProfileLink
    │           ├── SettingsLink
    │           └── LogoutButton
    │
    ├── Main Content
    │   └── {children} (page content)
    │
    └── BottomNavigation (mobile only)
        ├── NavItem (Market)
        ├── NavItem (Collection)
        ├── NavItem (Search)
        ├── NavItem (Rankings)
        └── NavItem (Profile)
```

---

## Reusable Components

### Base UI Components

Located in `packages/ui/src/components/` (shared across apps)

**Source:** shadcn/ui components customized with DaisyUI styles

**Installation:**
```bash
# Add shadcn component to shared package
cd packages/ui
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

#### 1. Button
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>
```

**Variants:**
- `primary`: Blue background, white text (CTA)
- `secondary`: White background, blue border (secondary actions)
- `ghost`: Transparent background (tertiary actions)
- `danger`: Red background, white text (destructive actions)

---

#### 2. Input
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  error="Invalid email format"
  icon={<Mail />}
/>
```

---

#### 3. Card
```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

<Card padding="md" shadow="md" hoverable>
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>
```

---

#### 4. Modal
```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

<Modal open={isOpen} onClose={handleClose} title="Add to Collection" size="md">
  <ModalBody>
    <AddCollectionForm />
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>
```

---

#### 5. Toast / Notification
```tsx
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // ms
  onClose?: () => void;
}

// Usage (via hook)
const { toast } = useToast();

toast.success('Card added to collection!');
toast.error('Failed to load data');
```

---

#### 6. Badge
```tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

<Badge variant="success">PSA 10</Badge>
<Badge variant="warning" dot>Low Confidence</Badge>
```

---

#### 7. Tabs
```tsx
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="risers">Top Risers</TabsTrigger>
    <TabsTrigger value="fallers">Top Fallers</TabsTrigger>
    <TabsTrigger value="volume">Most Traded</TabsTrigger>
  </TabsList>
  
  <TabsContent value="risers">
    <RisersTable />
  </TabsContent>
  <TabsContent value="fallers">
    <FallersTable />
  </TabsContent>
  <TabsContent value="volume">
    <VolumeTable />
  </TabsContent>
</Tabs>
```

---

#### 8. Skeleton (Loading)
```tsx
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

<Skeleton width={200} height={20} variant="text" />
<Skeleton width="100%" height={400} variant="rectangular" />
<Skeleton width={64} height={64} variant="circular" />
```

---

### Feature Components

Located in `components/features/`

#### 1. CardGridItem
```tsx
interface CardGridItemProps {
  card: Card;
  onCardClick?: (card: Card) => void;
  showPrice?: boolean;
  showGrade?: boolean;
}

<CardGridItem
  card={card}
  onCardClick={handleCardClick}
  showPrice
  showGrade
/>
```

**Displays:**
- Card image (lazy loaded)
- Card name
- Set name
- Price (if showPrice)
- Grade badge (if showGrade)
- Hover effect (lift + shadow)

---

#### 2. PriceChart
```tsx
interface PriceChartProps {
  data: PriceHistory[];
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  grade?: string;
  height?: number;
}

<PriceChart
  data={priceHistory}
  period="6M"
  onPeriodChange={setPeriod}
  grade="psa10"
  height={400}
/>
```

**Features:**
- Line chart (Recharts LineChart)
- Period selector buttons
- Hover tooltip with date + price
- Responsive (adapts to mobile)
- Loading skeleton

---

#### 3. GradeSelector
```tsx
interface GradeSelectorProps {
  value: GradeType;
  onChange: (grade: GradeType) => void;
  availableGrades?: GradeType[];
}

<GradeSelector
  value="psa10"
  onChange={setGrade}
  availableGrades={['raw', 'psa8', 'psa9', 'psa10']}
/>
```

**Displays:**
- Tab buttons for each grade
- Active state highlighting
- Disabled state for unavailable grades

---

#### 4. AddToCollectionButton
```tsx
interface AddToCollectionButtonProps {
  card: Card;
  onSuccess?: () => void;
}

<AddToCollectionButton
  card={card}
  onSuccess={() => toast.success('Added!')}
/>
```

**Behavior:**
- Opens AddCollectionModal on click
- Handles form submission
- Shows success/error feedback
- Updates collection cache (React Query)

---

## Responsive Design

### Breakpoints

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape, small tablets
      'md': '768px',   // Tablets
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px'  // Extra large desktop
    }
  }
}
```

### Layout Strategies

#### Mobile (< 768px)
- Single column layout
- Bottom navigation fixed
- Full-width cards
- Simplified tables (horizontal scroll)
- Collapsible filters

#### Tablet (768px - 1024px)
- 2-column grid for cards
- Bottom nav or top nav (configurable)
- Sidebar filters (collapsible)

#### Desktop (> 1024px)
- 3-4 column grid for cards
- Top navigation
- Persistent sidebar filters
- Hover interactions

---

### Responsive Component Example

```tsx
// components/layouts/CardGrid.tsx
export function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className={cn(
      'grid gap-4',
      'grid-cols-1',           // Mobile: 1 column
      'sm:grid-cols-2',         // Mobile landscape: 2 columns
      'md:grid-cols-3',         // Tablet: 3 columns
      'lg:grid-cols-4',         // Desktop: 4 columns
      'xl:grid-cols-5'          // Large desktop: 5 columns
    )}>
      {cards.map((card) => (
        <CardGridItem key={card.id} card={card} />
      ))}
    </div>
  );
}
```

---

## Component Props & Interfaces

### TypeScript Best Practices

```typescript
// types/components.ts

// Use descriptive prop names
interface CardImageViewerProps {
  images: CardImageUrls;
  cardName: string;
  onZoom?: () => void;
  loading?: boolean;
}

// Use union types for variants
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// Extend HTML element props when wrapping native elements
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

// Use generic types for reusable components
interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
}

// Use Pick/Omit for derived interfaces
type CardSummary = Pick<Card, 'id' | 'name' | 'image_urls' | 'current_price_psa10'>;
```

---

## State Management

### State Layers

#### 1. Server State (React Query)

```typescript
// hooks/useCard.ts
export function useCard(cardId: number) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: () => fetchCardById(cardId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });
}

// Usage in component
function CardProfile({ cardId }: { cardId: number }) {
  const { data: card, isLoading, error } = useCard(cardId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;

  return <CardDisplay card={card} />;
}
```

---

#### 2. Global UI State (Zustand)

```typescript
// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: 'CNY' | 'USD' | 'JPY';
  language: 'zh-CN' | 'en' | 'ja';
  
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: UIState['theme']) => void;
  setCurrency: (currency: UIState['currency']) => void;
  setLanguage: (language: UIState['language']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'system',
  currency: 'CNY',
  language: 'zh-CN',
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  setCurrency: (currency) => set({ currency }),
  setLanguage: (language) => set({ language })
}));

// Usage
function SettingsPage() {
  const { currency, setCurrency } = useUIStore();
  
  return (
    <Select value={currency} onValueChange={setCurrency}>
      <option value="CNY">CNY (¥)</option>
      <option value="USD">USD ($)</option>
      <option value="JPY">JPY (¥)</option>
    </Select>
  );
}
```

---

#### 3. Authentication State (Zustand + Supabase)

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    set({ user: data.user, session: data.session });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  
  setUser: (user) => set({ user })
}));
```

---

#### 4. Local Component State (useState)

```typescript
// For ephemeral UI state (modals, dropdowns, form inputs)
function AddCollectionModal({ card }: { card: Card }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  
  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <Input
        label="Quantity"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value))}
      />
      <Input
        label="Purchase Price"
        type="number"
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(parseFloat(e.target.value))}
      />
    </Modal>
  );
}
```

---

## Summary

### Component Library

**Base Components (15):**
- Button, Input, Card, Modal, Toast, Badge, Tabs, Skeleton
- Select, Checkbox, Radio, Switch, Tooltip, Popover, Dropdown

**Feature Components (20+):**
- CardGridItem, CardProfile, PriceChart, GradeSelector
- CollectionItem, PortfolioSummary, WatchlistItem
- SearchBar, Autocomplete, FilterBar, SortControls
- MarketIndexCard, KLineChart, RankingsTable
- AddToCollectionButton, AddToWatchlistButton

**Layout Components (5):**
- MainLayout, AuthLayout, BottomNav, Header, Sidebar

---

### Mobile-First Checklist

- [ ] All components designed for 375px width first
- [ ] Touch targets ≥44px (buttons, links, tabs)
- [ ] Bottom navigation for primary actions
- [ ] Swipe gestures for carousels
- [ ] Collapsible filters/sidebars
- [ ] Horizontal scroll for wide tables
- [ ] Lazy loading for images
- [ ] Skeleton loading states
- [ ] Pull-to-refresh (optional)
- [ ] Offline support (PWA)

---

### Accessibility Checklist

- [ ] Semantic HTML (header, nav, main, article)
- [ ] ARIA labels for icons and interactive elements
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Focus indicators visible
- [ ] Color contrast ≥4.5:1
- [ ] Screen reader tested (VoiceOver, TalkBack)
- [ ] Form validation messages accessible
- [ ] Skip to main content link
- [ ] Responsive text (min 16px on mobile)
- [ ] No content hidden by fixed elements

---

**Document Status:** ✅ Ready for Implementation  
**Version:** 2.0 (Updated with shadcn/ui + DaisyUI)  
**Last Review:** December 4, 2025  
**Next Review:** After UI implementation + user testing

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) UI Architecture
