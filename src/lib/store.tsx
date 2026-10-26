import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

/** Price in cents to avoid floating-point issues. */
export type Product = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
};

export type OrderLine = {
  productId: string;
  quantity: number;
};

export type SaleLine = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type Sale = {
  id: string;
  completedAt: string;
  lines: SaleLine[];
  totalCents: number;
};

const PRODUCTS_KEY = 'kasse/products';
const SALES_KEY = 'kasse/sales';
const CASH_START_KEY = 'kasse/cash-start';

export type CashStart = {
  /** Local date key YYYY-MM-DD. */
  date: string;
  cents: number;
};

/** Local date key for comparing "is today". */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isToday(iso: string): boolean {
  return dateKey(new Date(iso)) === dateKey(new Date());
}

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'pommes', name: 'Pommes', category: 'Essen', priceCents: 300 },
  { id: 'currywurst', name: 'Currywurst', category: 'Essen', priceCents: 350 },
  { id: 'burger', name: 'Burger', category: 'Essen', priceCents: 500 },
  { id: 'bratwurst', name: 'Bratwurst', category: 'Essen', priceCents: 320 },
  { id: 'cola', name: 'Cola', category: 'Getränke', priceCents: 250 },
  { id: 'wasser', name: 'Wasser', category: 'Getränke', priceCents: 150 },
  { id: 'bier', name: 'Bier', category: 'Getränke', priceCents: 300 },
];

export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

type KasseContextValue = {
  products: Product[];
  order: OrderLine[];
  totalCents: number;
  sales: Sale[];
  isLoaded: boolean;
  addToOrder: (productId: string) => void;
  changeQuantity: (productId: string, delta: number) => void;
  removeFromOrder: (productId: string) => void;
  clearOrder: () => void;
  updatePrice: (productId: string, priceCents: number) => void;
  addProduct: (name: string, category: string, priceCents: number) => void;
  removeProduct: (productId: string) => void;
  completeSale: () => Sale | null;
  cashStart: CashStart | null;
  setCashStart: (cents: number) => void;
  todaysSales: Sale[];
  todaysTotalCents: number;
};

const KasseContext = createContext<KasseContextValue | null>(null);

export function KasseProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashStart, setCashStartState] = useState<CashStart | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [productsJson, salesJson, cashJson] = await Promise.all([
          AsyncStorage.getItem(PRODUCTS_KEY),
          AsyncStorage.getItem(SALES_KEY),
          AsyncStorage.getItem(CASH_START_KEY),
        ]);
        if (productsJson) setProducts(JSON.parse(productsJson));
        if (salesJson) setSales(JSON.parse(salesJson));
        if (cashJson) setCashStartState(JSON.parse(cashJson));
      } catch (e) {
        console.warn('Kasse: could not load stored data', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const persistProducts = useCallback((next: Product[]) => {
    setProducts(next);
    AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('Kasse: could not save products', e),
    );
  }, []);

  const persistSales = useCallback((next: Sale[]) => {
    setSales(next);
    AsyncStorage.setItem(SALES_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('Kasse: could not save sales', e),
    );
  }, []);

  const addToOrder = useCallback((productId: string) => {
    setOrder((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const changeQuantity = useCallback((productId: string, delta: number) => {
    setOrder((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: l.quantity + delta }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeFromOrder = useCallback((productId: string) => {
    setOrder((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearOrder = useCallback(() => setOrder([]), []);

  const updatePrice = useCallback(
    (productId: string, priceCents: number) => {
      persistProducts(
        products.map((p) => (p.id === productId ? { ...p, priceCents } : p)),
      );
    },
    [products, persistProducts],
  );

  const addProduct = useCallback(
    (name: string, category: string, priceCents: number) => {
      const trimmed = name.trim();
      const trimmedCategory = category.trim() || 'Sonstiges';
      if (!trimmed) return;
      const id = `${trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      persistProducts([
        ...products,
        { id, name: trimmed, category: trimmedCategory, priceCents },
      ]);
    },
    [products, persistProducts],
  );

  const removeProduct = useCallback(
    (productId: string) => {
      persistProducts(products.filter((p) => p.id !== productId));
      setOrder((prev) => prev.filter((l) => l.productId !== productId));
    },
    [products, persistProducts],
  );

  const priceById = useMemo(
    () => new Map(products.map((p) => [p.id, p.priceCents])),
    [products],
  );

  const totalCents = useMemo(
    () =>
      order.reduce(
        (sum, l) => sum + (priceById.get(l.productId) ?? 0) * l.quantity,
        0,
      ),
    [order, priceById],
  );

  const setCashStart = useCallback((cents: number) => {
    const entry: CashStart = { date: dateKey(new Date()), cents };
    setCashStartState(entry);
    AsyncStorage.setItem(CASH_START_KEY, JSON.stringify(entry)).catch((e) =>
      console.warn('Kasse: could not save cash start', e),
    );
  }, []);

  const todaysSales = useMemo(
    () => sales.filter((s) => isToday(s.completedAt)),
    [sales],
  );

  const todaysTotalCents = useMemo(
    () => todaysSales.reduce((sum, s) => sum + s.totalCents, 0),
    [todaysSales],
  );

  const completeSale = useCallback((): Sale | null => {
    if (order.length === 0) return null;
    const lines: SaleLine[] = order
      .map((l) => {
        const product = products.find((p) => p.id === l.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          unitPriceCents: product.priceCents,
          quantity: l.quantity,
        };
      })
      .filter((l): l is SaleLine => l !== null);
    const sale: Sale = {
      id: `${Date.now()}`,
      completedAt: new Date().toISOString(),
      lines,
      totalCents: lines.reduce(
        (sum, l) => sum + l.unitPriceCents * l.quantity,
        0,
      ),
    };
    persistSales([...sales, sale]);
    setOrder([]);
    return sale;
  }, [order, products, sales, persistSales]);

  const value = useMemo(
    () => ({
      products,
      order,
      totalCents,
      sales,
      isLoaded,
      addToOrder,
      changeQuantity,
      removeFromOrder,
      clearOrder,
      updatePrice,
      addProduct,
      removeProduct,
      completeSale,
      cashStart,
      setCashStart,
      todaysSales,
      todaysTotalCents,
    }),
    [
      products,
      order,
      totalCents,
      sales,
      isLoaded,
      addToOrder,
      changeQuantity,
      removeFromOrder,
      clearOrder,
      updatePrice,
      addProduct,
      removeProduct,
      completeSale,
      cashStart,
      setCashStart,
      todaysSales,
      todaysTotalCents,
    ],
  );

  return (
    <KasseContext.Provider value={value}>{children}</KasseContext.Provider>
  );
}

export function useKasse(): KasseContextValue {
  const ctx = useContext(KasseContext);
  if (!ctx) throw new Error('useKasse must be used within KasseProvider');
  return ctx;
}
