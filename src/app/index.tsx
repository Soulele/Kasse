import { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
    formatEuro,
    useKasse,
    type OrderLine,
    type Product,
} from '@/lib/store';

const PRODUCT_COLUMNS_PHONE = 3;
const PRODUCT_COLUMNS_TABLET = 4;
const ORDER_PANEL_WIDTH = 340;
const WIDE_BREAKPOINT = 768;

function ProductButton({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} ${formatEuro(product.priceCents)}`}
      style={({ pressed }) => [styles.productButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.productName} numberOfLines={2}>
        {product.name}
      </ThemedText>
      <ThemedText type="small" style={styles.productPrice}>
        {formatEuro(product.priceCents)}
      </ThemedText>
    </Pressable>
  );
}

function OrderLineRow({
  line,
  product,
}: {
  line: OrderLine;
  product: Product;
}) {
  const { changeQuantity, removeFromOrder } = useKasse();
  const lineTotal = product.priceCents * line.quantity;
  return (
    <ThemedView type="background" style={styles.orderLine}>
      <ThemedView style={styles.orderLineInfo}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {line.quantity} × {formatEuro(product.priceCents)} ={' '}
          {formatEuro(lineTotal)}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.orderLineActions}>
        <Pressable
          onPress={() => changeQuantity(line.productId, -1)}
          style={styles.qtyButton}
          accessibilityLabel={`${product.name} weniger`}>
          <ThemedText type="subtitle" style={styles.qtyButtonText}>
            −
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.qtyText}>
          {line.quantity}
        </ThemedText>
        <Pressable
          onPress={() => changeQuantity(line.productId, 1)}
          style={styles.qtyButton}
          accessibilityLabel={`${product.name} mehr`}>
          <ThemedText type="subtitle" style={styles.qtyButtonText}>
            +
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => removeFromOrder(line.productId)}
          style={styles.removeButton}
          accessibilityLabel={`${product.name} entfernen`}>
          <ThemedText type="small" style={styles.removeButtonText}>
            ✕
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export default function KasseScreen() {
  const { products, order, totalCents, addToOrder, clearOrder, completeSale } =
    useKasse();
  const { width } = useWindowDimensions();
  const [lastSaleTotal, setLastSaleTotal] = useState<number | null>(null);

  const isWide = width >= WIDE_BREAKPOINT;
  const columns = isWide ? PRODUCT_COLUMNS_TABLET : PRODUCT_COLUMNS_PHONE;

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products],
  );

  const orderLines = order
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((x): x is { line: OrderLine; product: Product } => !!x.product);

  const handleCheckout = () => {
    Alert.alert(
      'Verkauf abschließen?',
      `Gesamtbetrag: ${formatEuro(totalCents)}`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abschließen',
          onPress: () => {
            const sale = completeSale();
            if (sale) setLastSaleTotal(sale.totalCents);
          },
        },
      ],
    );
  };

  const orderPanel = (
    <ThemedView
      type="backgroundElement"
      style={[styles.orderPanel, isWide && styles.orderPanelWide]}>
      <ThemedText type="subtitle">Bestellung</ThemedText>
      <ScrollView style={styles.orderList}>
        {orderLines.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Noch keine Produkte. Tippe auf ein Produkt.
          </ThemedText>
        ) : (
          orderLines.map(({ line, product }) => (
            <OrderLineRow key={line.productId} line={line} product={product} />
          ))
        )}
      </ScrollView>

      {lastSaleTotal !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          Letzter Verkauf: {formatEuro(lastSaleTotal)}
        </ThemedText>
      )}

      <ThemedView style={styles.totalRow}>
        <ThemedText type="subtitle">Summe</ThemedText>
        <ThemedText type="title" style={styles.totalText}>
          {formatEuro(totalCents)}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.checkoutRow}>
        <Pressable
          onPress={clearOrder}
          disabled={order.length === 0}
          style={[styles.clearButton, order.length === 0 && styles.disabled]}>
          <ThemedText type="smallBold" style={styles.clearButtonText}>
            Löschen
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleCheckout}
          disabled={order.length === 0}
          style={[
            styles.checkoutButton,
            { backgroundColor: '#2F9E44' },
            order.length === 0 && styles.disabled,
          ]}>
          <ThemedText type="smallBold" style={styles.checkoutButtonText}>
            Verkauf abschließen
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );

  const productGrid = (
    <ScrollView style={styles.productArea}>
      {categories.map((category) => (
        <ThemedView key={category} style={styles.categorySection}>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.categoryTitle}>
            {category.toUpperCase()}
          </ThemedText>
          <ThemedView style={styles.grid}>
            {products
              .filter((p) => p.category === category)
              .map((p) => (
                <ThemedView
                  key={p.id}
                  style={{ width: `${100 / columns}%` as `${number}%` }}>
                  <ProductButton product={p} onPress={() => addToOrder(p.id)} />
                </ThemedView>
              ))}
          </ThemedView>
        </ThemedView>
      ))}
    </ScrollView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, isWide && styles.safeAreaWide]}
        edges={['top', 'left', 'right']}>
        {isWide ? (
          <>
            <ThemedView style={styles.productsWide}>{productGrid}</ThemedView>
            <ThemedView style={styles.orderWide}>{orderPanel}</ThemedView>
          </>
        ) : (
          <>
            <ThemedView style={styles.productsNarrow}>{productGrid}</ThemedView>
            {orderPanel}
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.two,
  },
  safeAreaWide: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  productsWide: {
    flex: 1,
  },
  productsNarrow: {
    flex: 1,
  },
  orderWide: {
    width: ORDER_PANEL_WIDTH,
  },
  productArea: {
    flex: 1,
  },
  categorySection: {
    marginTop: Spacing.two,
  },
  categoryTitle: {
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productButton: {
    margin: Spacing.one,
    minHeight: 88,
    borderRadius: Spacing.three,
    backgroundColor: '#E8590C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  productName: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  productPrice: {
    color: '#FFE8D9',
  },
  orderPanel: {
    maxHeight: '46%',
    minHeight: 200,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  orderPanelWide: {
    flex: 1,
    maxHeight: '100%',
  },
  orderList: {
    flexShrink: 1,
    flexGrow: 0,
  },
  orderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  orderLineInfo: {
    flex: 1,
  },
  orderLineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8590C',
  },
  qtyButtonText: {
    color: '#FFFFFF',
  },
  qtyText: {
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#E8590C',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 32,
  },
  checkoutRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  clearButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#E8590C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#E8590C',
  },
  checkoutButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.4,
  },
});
