import React, { useState } from 'react';

const DICE_TYPES = [
  { key: 'd4', label: 'd4', sides: 4 },
  { key: 'd6', label: 'd6', sides: 6 },
  { key: 'd8', label: 'd8', sides: 8 },
  { key: 'd10', label: 'd10', sides: 10 },
  { key: 'd12', label: 'd12', sides: 12 },
  { key: 'd20', label: 'd20', sides: 20 },
  { key: 'd100', label: 'd100', sides: 100 },
];

export default function DiceRoller({ onRoll, lastRoll, color, onColorChange }) {
  const [counts, setCounts] = useState({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
  const [explosive, setExplosive] = useState(false);
  const [diceColor, setDiceColor] = useState(color || '#e94560');

  function changeCount(key, delta) {
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  }

  function handleRoll() {
    const hasDice = Object.values(counts).some((c) => c > 0);
    if (!hasDice) return;
    onRoll({ dice: counts, explosive });
  }

  function handleClear() {
    setCounts({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 });
  }

  function handleColorChange(e) {
    setDiceColor(e.target.value);
    onColorChange?.(e.target.value);
  }

  const styles = {
    container: {
      padding: '16px', background: '#1a1a2e', borderRadius: '12px',
      border: '1px solid #0f3460'
    },
    title: { fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#eee' },
    diceGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '8px', marginBottom: '16px'
    },
    dieCard: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#16213e', borderRadius: '8px', padding: '8px 12px',
      border: '1px solid #0f3460'
    },
    dieLabel: { fontSize: '15px', fontWeight: 600, color: '#eee' },
    dieSide: { fontSize: '11px', color: '#888', marginLeft: '4px' },
    countControl: { display: 'flex', alignItems: 'center', gap: '6px' },
    countBtn: {
      width: '26px', height: '26px', border: 'none', borderRadius: '6px',
      background: '#0f3460', color: '#eee', fontSize: '16px', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1
    },
    countValue: {
      fontSize: '18px', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: '#eee'
    },
    optionsRow: {
      display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px',
      flexWrap: 'wrap'
    },
    toggleLabel: {
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#ccc',
      cursor: 'pointer'
    },
    toggleInput: { width: '16px', height: '16px', cursor: 'pointer' },
    colorLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#ccc' },
    colorInput: { width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 },
    actions: { display: 'flex', gap: '8px', marginBottom: '16px' },
    rollBtn: {
      padding: '10px 24px', border: 'none', borderRadius: '8px',
      background: diceColor, color: '#fff', fontSize: '15px', fontWeight: 600,
      cursor: 'pointer', flex: 1
    },
    clearBtn: {
      padding: '10px 20px', border: '1px solid #0f3460', borderRadius: '8px',
      background: 'transparent', color: '#ccc', fontSize: '14px', cursor: 'pointer'
    },
    resultBox: {
      background: '#16213e', borderRadius: '8px', padding: '12px 16px',
      border: `1px solid ${diceColor}40`, minHeight: '60px'
    },
    resultTitle: { fontSize: '13px', color: '#888', marginBottom: '8px' },
    dieResultRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' },
    dieResultGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
    dieResultLabel: { fontSize: '12px', fontWeight: 600, color: '#aaa' },
    dieResultDice: { display: 'flex', gap: '3px', flexWrap: 'wrap' },
    dieResultValue: (val, isMax, color) => ({
      width: '28px', height: '28px', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 700,
      background: isMax ? `${color}30` : '#0f3460',
      color: isMax ? color : '#eee',
      border: isMax ? `1px solid ${color}` : '1px solid transparent'
    }),
    total: {
      fontSize: '18px', fontWeight: 700, textAlign: 'center',
      padding: '8px', borderRadius: '8px', background: `${diceColor}20`,
      color: diceColor
    },
    emptyResult: { color: '#555', fontSize: '14px', textAlign: 'center', padding: '16px' },
    savageBtn: {
      padding: '8px 16px', border: '1px solid #e94560', borderRadius: '8px',
      background: 'transparent', color: '#e94560', fontSize: '13px', cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={styles.title}>🎲 Mesa de dados</div>
        <button style={styles.savageBtn} onClick={() => setCounts({ d4: 0, d6: 1, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 })}>
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
        <button style={styles.rollBtn} onClick={handleRoll}>🎲 Tirar</button>
        <button style={styles.clearBtn} onClick={handleClear}>Limpiar</button>
      </div>

      <div style={styles.resultBox}>
        <div style={styles.resultTitle}>Resultado</div>
        {lastRoll ? (
          <div>
            {Object.entries(lastRoll.dice).map(([key, values]) => (
              <div key={key} style={styles.dieResultRow}>
                <div style={styles.dieResultGroup}>
                  <span style={styles.dieResultLabel}>{key}:</span>
                  <div style={styles.dieResultDice}>
                    {values.map((v, i) => {
                      const dieType = DICE_TYPES.find((d) => d.key === key);
                      const isMax = dieType && v >= dieType.sides;
                      return (
                        <span key={i} style={styles.dieResultValue(v, isMax, diceColor)}>
                          {v}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div style={styles.total}>Total: {lastRoll.total}</div>
          </div>
        ) : (
          <div style={styles.emptyResult}>Tira los dados para ver el resultado</div>
        )}
      </div>
    </div>
  );
}
