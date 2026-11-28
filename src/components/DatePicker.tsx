// GOLFLASH_GLOBAL_THEME
import { useGolTheme, gfStyle, gfColor, gfColors } from "../services/globalTheme";
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dayFromOffset } from '../services/football';

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const MIN_YEAR = 2023;
const MAX_YEAR = Math.max(
  2027,
  Number(dayFromOffset(0).slice(0, 4)) + 1
);

const GREEN = '#4AAE39';

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DatePicker({
  visible,
  value,
  onClose,
  onConfirm,
}: Props) {
  const gfDark = useGolTheme();

  const [selected, setSelected] = useState(value);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10);
  const [showYears, setShowYears] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const [y, m] = value.split('-').map(Number);

    setSelected(value);
    setYear(y);
    setMonth(m - 1);
    setShowYears(false);
  }, [visible, value]);

  const today = dayFromOffset(0);

  const firstDay =
    (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const totalDays =
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= totalDays ? day : null;
  });

  const years = Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 },
    (_, i) => MIN_YEAR + i
  );

  function changeMonth(step: number) {
    const next = new Date(Date.UTC(year, month + step, 1));

    const nextYear = next.getUTCFullYear();

    if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) return;

    setYear(nextYear);
    setMonth(next.getUTCMonth());
  }

  function goToday() {
    const [y, m] = today.split('-').map(Number);

    setSelected(today);
    setYear(y);
    setMonth(m - 1);
    setShowYears(false);
  }

  const [selectedYear, selectedMonth, selectedDay] =
    selected.split('-').map(Number);

  const headerDate =
    `${selectedDay} ${MONTHS[selectedMonth - 1]?.slice(0, 3).toLowerCase()} ${selectedYear}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={gfStyle(styles.overlay, gfDark)}>
        <Pressable
          style={gfStyle(StyleSheet.absoluteFill, gfDark)}
          onPress={onClose}
        />

        <View style={gfStyle(styles.card, gfDark)}>
          <View style={gfStyle(styles.header, gfDark)}>
            <View style={gfStyle(styles.headerRow, gfDark)}>
              <Text style={gfStyle(styles.caption, gfDark)}>
                SELECCIONA UNA FECHA
              </Text>

              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={gfColor("#FFFFFF", gfDark, "text")} />
              </Pressable>
            </View>

            <Text style={gfStyle(styles.selectedDate, gfDark)}>
              {headerDate}
            </Text>

            <Text style={gfStyle(styles.timezone, gfDark)}>
              Fechas y horarios de Peru (UTC-5)
            </Text>
          </View>

          <View style={gfStyle(styles.body, gfDark)}>
            <View style={gfStyle(styles.navigation, gfDark)}>
              <Pressable
                style={gfStyle(styles.monthButton, gfDark)}
                onPress={() => setShowYears(!showYears)}
              >
                <Text style={gfStyle(styles.monthLabel, gfDark)}>
                  {MONTHS[month].toUpperCase()} DE {year}
                </Text>

                <Ionicons
                  name={showYears ? 'chevron-up' : 'chevron-down'}
                  color={gfColor("#BDBDBD", gfDark, "text")}
                  size={17}
                />
              </Pressable>

              {!showYears && (
                <>
                  <Pressable
                    style={gfStyle(styles.arrow, gfDark)}
                    onPress={() => changeMonth(-1)}
                    disabled={year === MIN_YEAR && month === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={23}
                      color={gfColor("#FFFFFF", gfDark, "text")}
                    />
                  </Pressable>

                  <Pressable
                    style={gfStyle(styles.arrow, gfDark)}
                    onPress={() => changeMonth(1)}
                    disabled={year === MAX_YEAR && month === 11}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={23}
                      color={gfColor("#FFFFFF", gfDark, "text")}
                    />
                  </Pressable>
                </>
              )}
            </View>

            {showYears ? (
              <ScrollView
                style={gfStyle(styles.yearsScroll, gfDark)}
                contentContainerStyle={gfStyle(styles.yearsGrid, gfDark)}
              >
                {years.map(item => (
                  <Pressable
                    key={item}
                    style={gfStyle([
                      styles.yearButton,
                      year === item && styles.yearActive,
                    ], gfDark)}
                    onPress={() => {
                      setYear(item);
                      setShowYears(false);
                    }}
                  >
                    <Text
                      style={gfStyle([
                        styles.yearText,
                        year === item && styles.activeText,
                      ], gfDark)}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View>
                <View style={gfStyle(styles.weekRow, gfDark)}>
                  {WEEK.map((label, i) => (
                    <Text key={i} style={gfStyle(styles.weekDay, gfDark)}>
                      {label}
                    </Text>
                  ))}
                </View>

                {Array.from({ length: 6 }, (_, row) => (
                  <View key={row} style={gfStyle(styles.weekRow, gfDark)}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, i) => {
                      const key = day
                        ? dateKey(year, month, day)
                        : '';

                      const active = key === selected;
                      const current = key === today;

                      return (
                        <View key={i} style={gfStyle(styles.dayCell, gfDark)}>
                          {day !== null && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                              accessibilityLabel={key}
                              onPress={() => setSelected(key)}
                              style={gfStyle([
                                styles.dayButton,
                                current && styles.today,
                                active && styles.activeDay,
                              ], gfDark)}
                            >
                              <Text
                                style={gfStyle([
                                  styles.dayText,
                                  current && styles.todayText,
                                  active && styles.activeText,
                                ], gfDark)}
                              >
                                {day}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            <View style={gfStyle(styles.actions, gfDark)}>
              <Pressable
                style={gfStyle(styles.action, gfDark)}
                onPress={goToday}
              >
                <Text style={gfStyle(styles.actionText, gfDark)}>HOY</Text>
              </Pressable>

              <Pressable
                style={gfStyle(styles.action, gfDark)}
                onPress={() => onConfirm(selected)}
              >
                <Text style={gfStyle(styles.actionText, gfDark)}>CONFIRMAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#303030',
    borderWidth: 1,
    borderColor: '#414141',
  },
  header: {
    padding: 24,
    backgroundColor: '#202020',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    color: '#EAEAEA',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  selectedDate: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '400',
    marginTop: 25,
    marginBottom: 10,
  },
  timezone: {
    color: '#A8A8A8',
    fontSize: 11,
  },
  body: {
    padding: 15,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 42,
  },
  monthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  monthLabel: {
    color: '#C8C8C8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  arrow: {
    padding: 8,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekDay: {
    flex: 1,
    color: '#A8A8A8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
    fontWeight: '600',
  },
  dayCell: {
    flex: 1,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 35,
    height: 35,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#E4E4E4',
    fontSize: 14,
  },
  today: {
    borderWidth: 1,
    borderColor: GREEN,
  },
  todayText: {
    color: GREEN,
    fontWeight: '700',
  },
  activeDay: {
    backgroundColor: GREEN,
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  yearsScroll: {
    height: 290,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 15,
  },
  yearButton: {
    width: '31%',
    margin: '1%',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearActive: {
    backgroundColor: GREEN,
  },
  yearText: {
    color: '#DDDDDD',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 10,
  },
  action: {
    paddingVertical: 13,
    paddingHorizontal: 11,
  },
  actionText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
});