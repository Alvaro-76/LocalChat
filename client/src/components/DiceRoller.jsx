import React, { useState, useEffect, useRef } from 'react';

const DICE_TYPES = [
  { key: 'd4', label: 'd4', sides: 4 },
  { key: 'd6', label: 'd6', sides: 6 },
  { key: 'd8', label: 'd8', sides: 8 },
  { key: 'd10', label: 'd10', sides: 10 },
  { key: 'd12', label: 'd12', sides: 12 },
  { key: 'd20', label: 'd20', sides: 20 },
  { key: 'd100', label: 'd100', sides: 100 },
];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRoller({ onRoll, lastRoll, color, onColorChange, disabled, currentDiceConfig, onConfigChange }) {
  const [localCounts, setLocalCounts] = useState({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
  const [explosive, setExplosive] = useState(false);
  const [diceColor, setDiceColor] = useState(color || '#4F6CF7');

  const [animPhase, setAnimPhase] = useState('idle');
  const [flatDice, setFlatDice] = useState([]);
  const [dieStates, setDieStates] = useState([]);
  const [animTotal, setAnimTotal] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  const cancelledRef = useRef(false);
  const cleanupRef = useRef(null);

  const counts = disabled ? (currentDiceConfig || { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 }) : localCounts;

  const configTimerRef = useRef(null);

  useEffect(() => {
    if (disabled || !onConfigChange) return;
    if (configTimerRef.current) clearTimeout(configTimerRef.current);
    configTimerRef.current = setTimeout(() => {
      onConfigChange(localCounts);
    }, 80);
    return () => { if (configTimerRef.current) clearTimeout(configTimerRef.current); };
  }, [localCounts, disabled, onConfigChange]);

  function changeCount(key, delta) {
    if (disabled) return;
    setLocalCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  }

  function handleRoll() {
    const hasDice = Object.values(counts).some((c) => c > 0);
    if (!hasDice) return;
    if (animPhase === 'dice' || animPhase === 'total') return;
    if (disabled) return;
    onRoll({ dice: counts, explosive });
  }

  function handleClear() {
    if (animPhase !== 'idle') return;
    if (disabled) return;
    setLocalCounts({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
  }

  function handleColorChange(e) {
    setDiceColor(e.target.value);
    onColorChange?.(e.target.value);
  }

  const rollVersion = useRef(0);

  useEffect(() => {
    if (!disabled) {
      setLocalCounts({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
    }
  }, [lastRoll]);

  useEffect(() => {
    if (!lastRoll) return;

    const dice = lastRoll.dice;
    const flat = [];
    for (const [key, values] of Object.entries(dice)) {
      if (values && values.length > 0) {
        const dieType = DICE_TYPES.find((d) => d.key === key);
        const sides = dieType?.sides || 6;
        for (const val of values) {
          flat.push({ key, sides, finalValue: val });
        }
      }
    }
    if (flat.length === 0) return;

    const version = ++rollVersion.current;
    cancelledRef.current = false;

    setFlatDice(flat);
    setDieStates(flat.map(() => ({ state: 'waiting', displayValue: 0 })));
    setAnimTotal(0);
    setFinalTotal(lastRoll.total || 0);
    setAnimPhase('dice');

    function animateDie(idx) {
      if (cancelledRef.current || version !== rollVersion.current) return;
      if (idx >= flat.length) {
        setAnimPhase('total');
        const total = lastRoll.total || 0;
        const steps = 20;
        let step = 0;
        function countUp() {
          if (cancelledRef.current || version !== rollVersion.current) return;
          step++;
          if (step < steps) {
            setAnimTotal(Math.round((total / steps) * step));
            setTimeout(countUp, 30);
          } else {
            setAnimTotal(total);
            setAnimPhase('done');
          }
        }
        setTimeout(countUp, 200);
        return;
      }

      const die = flat[idx];
      setDieStates((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], state: 'rolling' };
        return next;
      });

      let tick = 0;
      const maxTicks = 10 + Math.floor(Math.random() * 4);
      function rollTick() {
        if (cancelledRef.current || version !== rollVersion.current) return;
        tick++;
        if (tick < maxTicks) {
          setDieStates((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], displayValue: rollDie(die.sides) };
            return next;
          });
          setTimeout(rollTick, 50 + Math.random() * 30);
        } else {
          setDieStates((prev) => {
            const next = [...prev];
            next[idx] = { state: 'settled', displayValue: die.finalValue };
            return next;
          });
          setTimeout(() => {
            if (!cancelledRef.current && version === rollVersion.current) {
              setAnimTotal((prev) => prev + die.finalValue);
            }
            animateDie(idx + 1);
          }, 150);
        }
      }
      rollTick();
    }

    setTimeout(() => {
      if (!cancelledRef.current && version === rollVersion.current) {
        animateDie(0);
      }
    }, 400);
    return () => { cancelledRef.current = true; };
  }, [lastRoll]);

  const styles = {
    container: {
      padding: '16px', background: 'var(--surface)', borderRadius: '12px',
      border: '1px solid var(--border)'
    },
    title: { fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' },
    diceGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '8px', marginBottom: '16px'
    },
    dieCard: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--surface-hover)', borderRadius: '8px', padding: '8px 12px',
      border: '1px solid var(--border)'
    },
    dieLabel: { fontSize: '15px', fontWeight: 600, color: 'var(--text)' },
    dieSide: { fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' },
    countControl: { display: 'flex', alignItems: 'center', gap: '6px' },
    countBtn: {
      width: '26px', height: '26px', border: 'none', borderRadius: '6px',
      background: disabled ? 'transparent' : 'var(--border)', color: disabled ? 'var(--text-muted)' : 'var(--text)', fontSize: '16px', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1
    },
    countValue: {
      fontSize: '18px', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: 'var(--text)'
    },
    optionsRow: {
      display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px',
      flexWrap: 'wrap'
    },
    toggleLabel: {
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)',
      cursor: 'pointer'
    },
    toggleInput: { width: '16px', height: '16px', cursor: 'pointer' },
    colorLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' },
    colorInput: { width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 },
    actions: { display: 'flex', gap: '8px', marginBottom: '16px' },
    rollBtn: {
      padding: '10px 24px', border: 'none', borderRadius: '8px',
      background: disabled ? 'var(--text-muted)' : diceColor, color: '#fff', fontSize: '15px', fontWeight: 600,
      cursor: animPhase === 'dice' || animPhase === 'total' || disabled ? 'not-allowed' : 'pointer', flex: 1, opacity: animPhase === 'dice' || animPhase === 'total' || disabled ? 0.6 : 1
    },
    clearBtn: {
      padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px',
      background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer'
    },
    resultBox: {
      background: 'var(--surface-hover)', borderRadius: '8px', padding: '12px 16px',
      border: `1px solid ${diceColor}40`, minHeight: '60px',
      transition: 'border-color 0.3s'
    },
    resultTitle: { fontSize: '13px', color: 'var(--text)', marginBottom: '8px' },
    dieRow: {
      display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px',
      animation: 'fadeInUp 0.25s ease-out'
    },
    dieGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
    resultDieLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' },
    dieDice: { display: 'flex', gap: '3px', flexWrap: 'wrap' },
    dieValue: (val, isMax, col, state) => ({
      width: '28px', height: '28px', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 700,
      background: isMax ? `${col}30` : (state === 'rolling' ? `${col}15` : 'var(--surface)'),
      color: isMax ? col : (state === 'rolling' ? col : 'var(--text)'),
      border: isMax ? `1px solid ${col}` : (state === 'rolling' ? `1px solid ${col}50` : '1px solid var(--border)'),
      transition: 'all 0.1s',
      transform: state === 'rolling' ? 'scale(1.08)' : 'scale(1)'
    }),
    totalContainer: {
      marginTop: '8px', paddingTop: '8px',
      borderTop: '1px solid var(--border)',
      animation: 'fadeInUp 0.3s ease-out'
    },
    total: {
      fontSize: '18px', fontWeight: 700, textAlign: 'center',
      padding: '8px', borderRadius: '8px', background: `${diceColor}20`,
      color: diceColor, transition: 'all 0.2s'
    },
    emptyResult: { color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px' },
    savageBtn: {
      padding: '8px 16px', border: `1px solid ${disabled ? 'var(--text-muted)' : 'var(--primary)'}`, borderRadius: '8px',
      background: 'transparent', color: disabled ? 'var(--text-muted)' : 'var(--primary)', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer'
    }
  };

  function groupDiceForDisplay() {
    const groups = {};
    for (let i = 0; i < flatDice.length; i++) {
      const die = flatDice[i];
      if (!groups[die.key]) {
        groups[die.key] = { key: die.key, dice: [] };
      }
      const ds = dieStates[i];
      groups[die.key].dice.push({
        finalValue: die.finalValue,
        state: ds?.state || 'waiting',
        displayValue: ds?.displayValue || 0
      });
    }
    return Object.values(groups);
  }

  const displayGroups = animPhase !== 'idle' ? groupDiceForDisplay() : null;
  const showTotal = animPhase === 'total' || animPhase === 'done' || (animPhase === 'idle' && lastRoll);
  const displayTotal = animPhase === 'total' || animPhase === 'dice' ? animTotal : lastRoll?.total || 0;

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={styles.title}>🎲 Mesa de dados</div>
        <button style={styles.savageBtn} onClick={() => { if (!disabled) setLocalCounts({ d4: 0, d6: 1, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 }); }}>
          Iniciativa SW
        </button>
      </div>

      <div style={styles.diceGrid}>
        {DICE_TYPES.map((dt) => (
          <div key={dt.key} style={styles.dieCard}>
            <div>
              <div style={styles.dieLabel}>{dt.label}</div>
              <div style={styles.dieSide}>{dt.sides} caras</div>
            </div>
            <div style={styles.countControl}>
              <button style={styles.countBtn} onClick={() => changeCount(dt.key, -1)}>−</button>
              <span style={styles.countValue}>{counts[dt.key] || 0}</span>
              <button style={styles.countBtn} onClick={() => changeCount(dt.key, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.optionsRow}>
        <label style={styles.toggleLabel}>
          <input type="checkbox" style={styles.toggleInput} checked={explosive} onChange={(e) => setExplosive(e.target.checked)} />
          Modo explosivo
        </label>
        <label style={styles.colorLabel}>
          Color:
          <input type="color" style={styles.colorInput} value={diceColor} onChange={handleColorChange} />
        </label>
      </div>

      <div style={styles.actions}>
        <button style={styles.rollBtn} onClick={handleRoll}>
          {disabled ? '⏳ Espera tu turno' : animPhase === 'dice' ? '🎲 Tirando...' : animPhase === 'total' ? '🧮 Sumando...' : '🎲 Tirar'}
        </button>
        <button style={styles.clearBtn} onClick={handleClear}>Limpiar</button>
      </div>

      <div style={styles.resultBox}>
        <div style={styles.resultTitle}>Resultado</div>
        {animPhase !== 'idle' && displayGroups ? (
          <div>
            {displayGroups.map((group) => {
              const hasVisible = group.dice.some((d) => d.state !== 'waiting');
              if (!hasVisible) return null;
              const dieType = DICE_TYPES.find((d) => d.key === group.key);
              return (
                <div key={group.key} style={styles.dieRow}>
                  <div style={styles.dieGroup}>
                    <span style={styles.resultDieLabel}>{group.key}:</span>
                    <div style={styles.dieDice}>
                      {group.dice.map((d, i) => {
                        const isMax = dieType && d.displayValue >= dieType.sides;
                        return (
                          <span key={i} style={styles.dieValue(d.displayValue, isMax, diceColor, d.state)}>
                            {d.state !== 'waiting' ? d.displayValue : '?'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : animPhase === 'idle' && lastRoll ? (
          <div>
            {Object.entries(lastRoll.dice).map(([key, values]) => {
              if (!values || values.length === 0) return null;
              const dieType = DICE_TYPES.find((d) => d.key === key);
              return (
                <div key={key} style={styles.dieRow}>
                  <div style={styles.dieGroup}>
                    <span style={styles.resultDieLabel}>{key}:</span>
                    <div style={styles.dieDice}>
                      {values.map((v, i) => {
                        const isMax = dieType && v >= dieType.sides;
                        return (
                          <span key={i} style={styles.dieValue(v, isMax, diceColor, 'settled')}>{v}</span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {(animPhase !== 'idle' || (animPhase === 'idle' && lastRoll)) && (
          <div style={styles.totalContainer}>
            <div style={styles.total}>Total: {displayTotal}</div>
          </div>
        )}

        {animPhase === 'idle' && !lastRoll && (
          <div style={styles.emptyResult}>Tira los dados para ver el resultado</div>
        )}
      </div>
    </div>
  );
}
