import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { Text } from '@/components/Text';
import { Body, Button, Card, Dim, Eyebrow, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { MysticLoader } from '@/components/MysticLoader';
import { useAdWatch } from '@/components/AdWatch';
import { useApp } from '@/state/app';
import { GAME_REWARD_CREDITS } from '@/shared/packages.ts';
import type { WordPuzzle } from '@/shared/wordgame.ts';
import { colors, serif } from '@/theme';

type Cell = [number, number];

const CELL = 32;
const GAP = 4;
const STEP = CELL + GAP;
const DIRS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function lineBetween(a: Cell, b: Cell): Cell[] | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  if (dr === 0 && dc === 0) return [a];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = dr === 0 ? 0 : dr / Math.abs(dr);
  const sc = dc === 0 ? 0 : dc / Math.abs(dc);
  const cells: Cell[] = [];
  for (let i = 0; i <= steps; i++) cells.push([a[0] + sr * i, a[1] + sc * i]);
  return cells;
}

/** İpucu için: kelime zaten ızgaraya yerleştirilmiş olduğundan (sunucu öyle üretti), harfleri tarayarak konumunu buluruz. */
function findWordCells(grid: string[][], word: string): Cell[] | null {
  const size = grid.length;
  const letters = Array.from(word);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== letters[0]) continue;
      for (const [dr, dc] of DIRS) {
        const cells: Cell[] = [];
        let ok = true;
        for (let i = 0; i < letters.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size || grid[rr][cc] !== letters[i]) { ok = false; break; }
          cells.push([rr, cc]);
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

const key = (c: Cell) => `${c[0]}-${c[1]}`;

interface FinishResult { rewarded: boolean; alreadyMaxedToday: boolean }

export default function WordGame() {
  const { api, run, setWallet, toast } = useApp();
  const { watch: watchAd, Overlay: AdOverlay } = useAdWatch();

  const [puzzle, setPuzzle] = useState<WordPuzzle | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Cell[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Record<string, Cell[]>>({});
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [hintCells, setHintCells] = useState<Cell[]>([]);
  const [hintBusy, setHintBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);

  const puzzleRef = useRef(puzzle);
  puzzleRef.current = puzzle;
  const foundRef = useRef(found);
  foundRef.current = found;
  const attemptRef = useRef(attemptId);
  attemptRef.current = attemptId;

  const finishGame = useCallback(async (foundSet: Set<string>) => {
    if (!attemptRef.current) return;
    setFinishing(true);
    const res = await run(() => api.gameFinish(attemptRef.current!, Array.from(foundSet)));
    setFinishing(false);
    if (res) {
      setWallet(res.wallet);
      setResult({ rewarded: res.rewarded, alreadyMaxedToday: res.alreadyMaxedToday });
    }
  }, [api, run, setWallet]);

  const startNew = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setFound(new Set());
    setFoundCells({});
    setSelection([]);
    setHintCells([]);
    setHintWord(null);
    const res = await run(() => api.gameStart());
    setLoading(false);
    if (res) { setPuzzle(res.puzzle); setAttemptId(res.attemptId); }
  }, [api, run]);

  useEffect(() => { startNew(); }, [startNew]);

  const cellAt = (x: number, y: number): Cell | null => {
    const col = Math.floor(x / STEP);
    const row = Math.floor(y / STEP);
    const size = puzzleRef.current?.grid.length ?? 0;
    if (row < 0 || row >= size || col < 0 || col >= size) return null;
    return [row, col];
  };

  const commitSelection = useCallback((sel: Cell[]) => {
    const p = puzzleRef.current;
    if (!p || sel.length < 2) { setSelection([]); return; }
    const word = sel.map(([r, c]) => p.grid[r][c]).join('');
    const rev = Array.from(word).reverse().join('');
    const hit = p.words.find((w) => (w === word || w === rev) && !foundRef.current.has(w));
    if (hit) {
      const next = new Set(foundRef.current);
      next.add(hit);
      setFound(next);
      setFoundCells((prev) => ({ ...prev, [hit]: sel }));
      if (hintWord === hit) { setHintWord(null); setHintCells([]); }
      if (next.size >= p.words.length) finishGame(next);
    }
    setSelection([]);
  }, [finishGame, hintWord]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const c = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        setSelection(c ? [c] : []);
      },
      onPanResponderMove: (e: GestureResponderEvent, _g: PanResponderGestureState) => {
        const c = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        if (!c) return;
        setSelection((sel) => {
          if (!sel.length) return [c];
          const line = lineBetween(sel[0], c);
          return line ?? sel;
        });
      },
      onPanResponderRelease: () => setSelection((sel) => { commitSelection(sel); return sel; }),
      onPanResponderTerminate: () => setSelection([]),
    }),
  ).current;

  const askHint = async () => {
    const p = puzzleRef.current;
    if (!p || hintBusy) return;
    const remaining = p.words.filter((w) => !foundRef.current.has(w));
    if (!remaining.length) return;
    setHintBusy(true);
    const res = await watchAd();
    setHintBusy(false);
    if (!res) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const cells = findWordCells(p.grid, word);
    if (!cells) return;
    setHintWord(word);
    setHintCells(cells);
    setTimeout(() => { setHintWord(null); setHintCells([]); }, 2400);
  };

  const finishEarly = () => {
    if (!found.size) { toast('Önce en az bir kelime bul.'); return; }
    finishGame(found);
  };

  if (loading) {
    return (
      <Screen title="Nova'nın Sözcük Bulmacası" back mark="puzzle">
        <MysticLoader messages={['Harfler telveden diziliyor…', 'Sözcükler ızgaraya yerleşiyor…']} />
      </Screen>
    );
  }

  if (result) {
    const total = puzzle?.words.length ?? 0;
    const complete = found.size >= total && total > 0;
    return (
      <Screen title="Nova'nın Sözcük Bulmacası" back mark="puzzle">
        <Card gold style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <Icon name={result.rewarded ? 'spark' : 'puzzle'} size={30} stroke={1.3} />
          <Text style={{ fontFamily: serif, fontSize: 22, color: colors.text, fontWeight: '600', textAlign: 'center' }}>
            {result.rewarded ? `+${GAME_REWARD_CREDITS} Kredi Kazandın!` : complete ? 'Bulmaca Tamamlandı' : 'Bulmaca Kapatıldı'}
          </Text>
          <Dim style={{ textAlign: 'center' }}>
            {result.rewarded
              ? 'Tüm kelimeleri buldun, telve seninle konuştu.'
              : result.alreadyMaxedToday
                ? 'Harika oynadın ama bugünkü oyun ödül hakkın doldu — yarın yeniden dene.'
                : complete
                  ? 'Tamamlandı sayılır ama ödül koşulları bu seferlik tutmadı.'
                  : `${found.size}/${total} kelime bulundu. Ödül için hepsini bulman gerekiyor.`}
          </Dim>
        </Card>
        <Button title="Yeni Bulmaca" variant="gold" onPress={startNew} testID="game-again" />
      </Screen>
    );
  }

  if (!puzzle) {
    return (
      <Screen title="Nova'nın Sözcük Bulmacası" back mark="puzzle">
        <Card><Dim>Bulmaca yüklenemedi. Tekrar dener misin?</Dim></Card>
        <Button title="Tekrar Dene" variant="gold" onPress={startNew} />
      </Screen>
    );
  }

  const size = puzzle.grid.length;
  const selSet = new Set(selection.map(key));
  const hintSet = new Set(hintCells.map(key));
  const foundSet = new Set(Object.values(foundCells).flat().map(key));

  return (
    <>
    <Screen title="Nova'nın Sözcük Bulmacası" subtitle="Harfleri sürükleyerek kelimeleri bul" back mark="puzzle">
      <Card>
        <View style={{ gap: 6 }}>
          <Eyebrow>Bulunacak kelimeler</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {puzzle.words.map((w) => (
              <View key={w} style={[s.wordChip, found.has(w) && s.wordChipDone]}>
                <Text style={{ color: found.has(w) ? colors.goldBright : colors.textDim, fontSize: 13, fontWeight: found.has(w) ? '600' : '400', textDecorationLine: found.has(w) ? 'line-through' : 'none' }}>{w}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <View style={{ alignItems: 'center' }}>
        <View
          style={{ width: size * STEP - GAP, height: size * STEP - GAP }}
          {...panResponder.panHandlers}
        >
          {puzzle.grid.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', position: 'absolute', top: r * STEP, left: 0 }}>
              {row.map((letter, c) => {
                const k = `${r}-${c}`;
                const on = selSet.has(k);
                const done = foundSet.has(k);
                const hinted = hintSet.has(k);
                return (
                  <View
                    key={c}
                    style={[
                      s.cell,
                      { marginRight: GAP },
                      done && s.cellDone,
                      on && s.cellActive,
                      hinted && s.cellHint,
                    ]}
                  >
                    <Text style={{ color: on || hinted ? colors.ink : done ? colors.goldBright : colors.text, fontSize: 15, fontWeight: '600' }}>{letter}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Body style={{ textAlign: 'center', color: colors.textDim, fontSize: 12.5 }}>
        Parmağını bir harften başlat, düz ya da çapraz bir çizgide sürükle, bırak.
      </Body>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Bitir" variant="ghost" style={{ flex: 1 }} onPress={finishEarly} loading={finishing} testID="game-finish" />
        <Button
          title={hintBusy ? 'Reklam…' : 'Reklam İzle · İpucu Al'}
          variant="ghost"
          style={{ flex: 1.6 }}
          loading={hintBusy}
          disabled={found.size >= puzzle.words.length}
          onPress={askHint}
          testID="game-hint"
        />
      </View>
      {hintWord ? <Dim style={{ textAlign: 'center' }}>İpucu: “{hintWord}” ızgarada parlıyor.</Dim> : null}
    </Screen>
    {AdOverlay}
    </>
  );
}

const s = StyleSheet.create({
  wordChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  wordChipDone: { borderColor: colors.borderGold, backgroundColor: colors.goldTint },
  cell: {
    width: CELL, height: CELL, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center',
  },
  cellActive: { backgroundColor: colors.gold, borderColor: colors.goldBright },
  cellDone: { backgroundColor: colors.goldTintStrong, borderColor: colors.borderGold },
  cellHint: { backgroundColor: colors.gold, borderColor: colors.goldBright },
});
