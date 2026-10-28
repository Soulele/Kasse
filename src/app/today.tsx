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
import { confirmDialog } from '@/lib/confirm';
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
  const { voidSale } = useKasse();
  const time = new Date(sale.completedAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const itemCount = sale.lines.reduce((sum, l) => sum + l.quantity, 0);
  const voided = !!sale.voidedAt;

  return (
    <ThemedView type="backgroundElement" style={styles.saleRow}>
      <ThemedView style={styles.saleRowInfo}>
        <ThemedText type="smallBold" style={voided && styles.voidedText}>
          {time} Uhr{sale.staffSale ? ' · MA' : ''}
          {voided ? ' · STORNIERT' : ''}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={voided && styles.voidedText}>
          {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}:{' '}
          {sale.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}
        </ThemedText>
      </ThemedView>
      <ThemedText type="smallBold" style={voided && styles.voidedText}>
        {formatEuro(sale.totalCents)}
      </ThemedText>
      {!voided && (
        <Pressable
          onPress={() =>
            confirmDialog(
              'Verkauf stornieren?',
              `${formatEuro(sale.totalCents)} wird aus dem Tagesumsatz
entfernt.`,
              () => voidSale(sale.id),
              'Stornieren',
              true,
            )
          }
          style={styles.voidButton}
          accessibilityLabel="Verkauf stornieren">
          <ThemedText type="small" style={styles.voidButtonText}>
            Storno
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

function DaySection({ dayKey, sales }: { dayKey: string; sales: Sale[] }) {
  const dayTotal = sales.reduce(
    (sum, s) => sum + (s.voidedAt ? 0 : s.totalCents),
    0,
  );
  const dateLabel = new Date(`${dayKey}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  return (
    <ThemedView style={styles.daySection}>
      <ThemedView style={styles.dayHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {dateLabel.toUpperCase()}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {formatEuro(dayTotal)}
        </ThemedText>
      </ThemedView>
      {sales.map((sale) => (
        <SaleRow key={sale.id} sale={sale} />
      ))}
    </ThemedView>
  );
}

export default function TodayScreen() {
  const {
    cashStart,
    setCashStart,
    sales,
    todaysSales,
    todaysTotalCents,
  } = useKasse();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [editingCash, setEditingCash] = useState(false);
  const [cashText, setCashText] = useState('');

  const todayKey = dateKey(new Date());
  const startIsToday = cashStart?.date === todayKey;
  const todaySalesActive = todaysSales.filter((s) => !s.voidedAt);

  const pastDays = [...new Set(
    sales
      .filter((s) => dateKey(new Date(s.completedAt)) !== todayKey)
      .map((s) => dateKey(new Date(s.completedAt))),
  )]
    .sort()
    .reverse();
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
              {todaySalesActive.length}{' '}
              {todaySalesActive.length === 1 ? 'Verkauf' : 'Verkäufe'}
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

          {pastDays.length > 0 && (
            <>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.salesTitle}>
                VERGANGENE TAGE
              </ThemedText>
              {pastDays.map((dayKey) => (
                <DaySection
                  key={dayKey}
                  dayKey={dayKey}
                  sales={sales
                    .filter(
                      (s) => dateKey(new Date(s.completedAt)) === dayKey,
                    )
                    .reverse()}
                />
              ))}
            </>
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
  voidedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  voidButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#E03131',
  },
  voidButtonText: {
    color: '#E03131',
  },
  daySection: {
    gap: Spacing.two,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
