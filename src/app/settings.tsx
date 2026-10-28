import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    BottomTabInset,
    Colors,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { alertMessage, confirmDialog } from '@/lib/confirm';
import { formatEuro, useKasse, type Product } from '@/lib/store';

function parseEuroToCents(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function PriceRow({ product }: { product: Product }) {
  const { updatePrice, updateStaffPrice, removeProduct } = useKasse();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [text, setText] = useState(centsToInput(product.priceCents));
  const [invalid, setInvalid] = useState(false);
  const [staffText, setStaffText] = useState(
    product.staffPriceCents != null ? centsToInput(product.staffPriceCents) : '',
  );
  const [staffInvalid, setStaffInvalid] = useState(false);

  const handleEndEditing = () => {
    const cents = parseEuroToCents(text);
    if (cents === null) {
      setInvalid(true);
      setText(centsToInput(product.priceCents));
      return;
    }
    setInvalid(false);
    setText(centsToInput(cents));
    if (cents !== product.priceCents) updatePrice(product.id, cents);
  };

  const handleStaffEndEditing = () => {
    if (staffText.trim() === '') {
      setStaffInvalid(false);
      setStaffText('');
      if (product.staffPriceCents != null) {
        updateStaffPrice(product.id, null);
      }
      return;
    }
    const cents = parseEuroToCents(staffText);
    if (cents === null) {
      setStaffInvalid(true);
      setStaffText(
        product.staffPriceCents != null
          ? centsToInput(product.staffPriceCents)
          : '',
      );
      return;
    }
    setStaffInvalid(false);
    setStaffText(centsToInput(cents));
    if (cents !== product.staffPriceCents) {
      updateStaffPrice(product.id, cents);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView style={styles.rowInfo}>
        <ThemedText type="smallBold">{product.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {product.category} · aktuell {formatEuro(product.priceCents)}
          {product.staffPriceCents != null &&
            ` · MA ${formatEuro(product.staffPriceCents)}`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.inputGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Normal
        </ThemedText>
        <ThemedView style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus
            accessibilityLabel={`Preis für ${product.name}`}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: invalid ? '#E03131' : colors.backgroundSelected,
                backgroundColor: colors.background,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            €
          </ThemedText>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.inputGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          MA
        </ThemedText>
        <ThemedView style={styles.inputWrap}>
          <TextInput
            value={staffText}
            onChangeText={setStaffText}
            onEndEditing={handleStaffEndEditing}
            onBlur={handleStaffEndEditing}
            keyboardType="decimal-pad"
            inputMode="decimal"
            selectTextOnFocus
            placeholder="–"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={`Mitarbeiterpreis für ${product.name}`}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: staffInvalid
                  ? '#E03131'
                  : colors.backgroundSelected,
                backgroundColor: colors.background,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            €
          </ThemedText>
        </ThemedView>
      </ThemedView>
      <Pressable
        onPress={() =>
          confirmDialog(
            'Produkt löschen?',
            `${product.name} wirklich aus der Kasse entfernen?`,
            () => removeProduct(product.id),
            'Löschen',
            true,
          )
        }
        style={styles.deleteButton}
        accessibilityLabel={`${product.name} löschen`}>
        <ThemedText type="small" style={styles.deleteButtonText}>
          ✕
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function NewProductForm({ categories }: { categories: string[] }) {
  const { addProduct } = useKasse();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const reset = () => {
    setName('');
    setCategory('');
    setPrice('');
    setOpen(false);
  };

  const handleAdd = () => {
    const cents = parseEuroToCents(price);
    if (!name.trim()) {
      alertMessage('Name fehlt', 'Bitte einen Produktnamen eingeben.');
      return;
    }
    if (cents === null) {
      alertMessage(
        'Preis ungültig',
        'Bitte einen gültigen Preis eingeben, z. B. 3,50.',
      );
      return;
    }
    addProduct(name, category || 'Sonstiges', cents);
    reset();
  };

  const inputStyle = [
    styles.formInput,
    {
      color: colors.text,
      borderColor: colors.backgroundSelected,
      backgroundColor: colors.background,
    },
  ];

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.addButton}
        accessibilityLabel="Neues Produkt hinzufügen">
        <ThemedText type="smallBold" style={styles.addButtonText}>
          + Neues Produkt
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      <ThemedText type="smallBold">Neues Produkt</ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name (z. B. Krakauer)"
        placeholderTextColor={colors.textSecondary}
        style={inputStyle}
        accessibilityLabel="Produktname"
      />
      <ThemedView style={styles.chipRow}>
        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[
              styles.chip,
              category === c && styles.chipSelected,
            ]}>
            <ThemedText
              type="small"
              style={category === c ? styles.chipTextSelected : undefined}>
              {c}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Kategorie (z. B. Essen, Getränke)"
        placeholderTextColor={colors.textSecondary}
        style={inputStyle}
        accessibilityLabel="Kategorie"
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Preis (z. B. 3,50)"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={inputStyle}
        accessibilityLabel="Preis"
      />
      <ThemedView style={styles.formActions}>
        <Pressable onPress={reset} style={styles.cancelButton}>
          <ThemedText type="smallBold" style={styles.cancelButtonText}>
            Abbrechen
          </ThemedText>
        </Pressable>
        <Pressable onPress={handleAdd} style={styles.saveButton}>
          <ThemedText type="smallBold" style={styles.saveButtonText}>
            Hinzufügen
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export default function SettingsScreen() {
  const { products } = useKasse();
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title">Produkte & Preise</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Preise anpassen — sie gelten sofort und bleiben nach einem Neustart
          gespeichert. Abgeschlossene Verkäufe bleiben unverändert.
        </ThemedText>
        <ScrollView>
          {categories.map((category) => (
            <ThemedView key={category} style={styles.categorySection}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.categoryTitle}>
                {category.toUpperCase()}
              </ThemedText>
              <ThemedView style={styles.categoryRows}>
                {products
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <PriceRow key={p.id} product={p} />
                  ))}
              </ThemedView>
            </ThemedView>
          ))}
          <ThemedView style={styles.newProductSection}>
            <NewProductForm categories={categories} />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.two,
  },
  categorySection: {
    marginTop: Spacing.three,
  },
  categoryTitle: {
    marginBottom: Spacing.one,
  },
  categoryRows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowInfo: {
    flex: 1,
  },
  inputGroup: {
    alignItems: 'center',
    gap: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    width: 72,
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    textAlign: 'right',
    paddingHorizontal: Spacing.two,
    fontSize: 18,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#E03131',
  },
  newProductSection: {
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  addButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E8590C',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#E8590C',
  },
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E8590C',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipSelected: {
    backgroundColor: '#E8590C',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#E8590C',
  },
  cancelButtonText: {
    color: '#E8590C',
  },
  saveButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#2F9E44',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});
