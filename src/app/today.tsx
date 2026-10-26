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
import {
  dateKey,
  formatEuro,
  useKasse,
  type Sale,
} from '@/lib/store';

function parseEuroToCents(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

function SaleRow({ sale }: { sale: Sale }) {
  const time = new Date(sale.completedAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const itemCount = sale.lines.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <ThemedView type="backgroundElement" style={styles.saleRow}>
      <ThemedView style={styles.saleRowInfo}>
        <ThemedText type="smallBold">{time} Uhr</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}:{' '}
          {sale.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}
        </ThemedText>
      </ThemedView>
      <ThemedText type="smallBold">{formatEuro(sale.totalCents)}</ThemedText>
    </ThemedView>
  );
}

export default function TodayScreen() {
  const { cashStart, setCashStart, todaysSales, todaysTotalCents } =
    useKasse();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [editingCash, setEditingCash] = useState(false);
  const [cashText, setCashText] = useState('');

  const startIsToday = cashStart?.date === dateKey(new Date());
  const startCents = startIsToday ? cashStart.cents : null;
  const expectedCashCents =
    startCents !== null ? startCents + todaysTotalCents : null;

  const handleSaveCash = () => {
    const cents = parseEuroToCents(cashText);
    if (cents !== null) {
      setCashStart(cents);
      setEditingCash(false);
      setCashText('');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title">Heute</ThemedText>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              KASSENBESTAND AM MORGEN
            </ThemedText>
            {editingCash ? (
              <ThemedView style={styles.cashEditRow}>
                <TextInput
                  value={cashText}
                  onChangeText={setCashText}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  placeholder="z. B. 50,00"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  onSubmitEditing={handleSaveCash}
                  style={[
                    styles.cashInput,
                    {
                      color: colors.text,
                      borderColor: colors.backgroundSelected,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
                <Pressable onPress={handleSaveCash} style={styles.saveButton}>
                  <ThemedText type="smallBold" style={styles.saveButtonText}>
                    OK
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <Pressable
                onPress={() => {
                  setCashText(
                    startCents !== null
                      ? (startCents / 100).toFixed(2).replace('.', ',')
                      : '',
                  );
                  setEditingCash(true);
                }}
                style={styles.cashDisplay}>
                <ThemedText type="title" style={styles.cashValue}>
                  {startCents !== null ? formatEuro(startCents) : '— €'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Tippen zum Eintragen
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TAGESUMSATZ
            </ThemedText>
            <ThemedText type="title" style={styles.revenueValue}>
              {formatEuro(todaysTotalCents)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {todaysSales.length}{' '}
              {todaysSales.length === 1 ? 'Verkauf' : 'Verkäufe'}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              SOLL-BESTAND IN DER KASSE
            </ThemedText>
            <ThemedText type="title" style={styles.revenueValue}>
              {expectedCashCents !== null
                ? formatEuro(expectedCashCents)
                : '— €'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Startbestand + Tagesumsatz
            </ThemedText>
          </ThemedView>

          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.salesTitle}>
            VERKÄUFE HEUTE
          </ThemedText>
          {todaysSales.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Noch keine Verkäufe heute.
            </ThemedText>
          ) : (
            [...todaysSales]
              .reverse()
              .map((sale) => <SaleRow key={sale.id} sale={sale} />)
          )}
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
  scrollContent: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cashEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cashInput: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 24,
  },
  cashDisplay: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  cashValue: {
    fontSize: 36,
  },
  revenueValue: {
    fontSize: 36,
    color: '#2F9E44',
  },
  saveButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#2F9E44',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  salesTitle: {
    marginTop: Spacing.two,
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  saleRowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
});
