import React, { useCallback } from 'react';
import { getSocket } from '../services/socket';

const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
const SUIT_COLORS = { spades: '#000', hearts: '#d32f2f', diamonds: '#d32f2f', clubs: '#000' };
const SUIT_LABELS = { spades: 'Picas', hearts: 'Corazones', diamonds: 'Diamantes', clubs: 'Tréboles' };

function cardDisplay(card) {
  if (!card) return null;
  if (card.value === 'JOKER') return { display: 'JOKER', color: '#7b1fa2' };
  const suit = card.suit;
  return {
    display: `${card.value}${SUIT_SYMBOLS[suit]}`,
    color: SUIT_COLORS[suit],
    suitLabel: SUIT_LABELS[suit]
  };
}

function CardFace({ card, selected, onClick, small }) {
  const info = cardDisplay(card);
  if (!info) return null;
  const isJoker = card.value === 'JOKER';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: small ? '2px 6px' : '4px 10px',
        borderRadius: '6px',
        border: selected ? `2px solid ${isJoker ? '#7b1fa2' : info.color}` : '1px solid var(--border)',
        background: selected ? `${isJoker ? '#7b1fa2' : info.color}20` : '#fff',
        cursor: onClick ? 'pointer' : 'default',
        fontWeight: 700, fontSize: small ? '12px' : '15px',
        color: info.color,
        minWidth: small ? 'auto' : '48px',
        textAlign: 'center',
        transition: 'all 0.15s'
      }}
    >
      {info.display}
    </div>
  );
}

function isNPC(username) {
  return username && username.startsWith('NPC:');
}

function emitOptions(socket, roomId, player, opts) {
  const payload = {
    roomId,
    iniciativa: opts.iniciativa || false,
    rapido: opts.rapido || false,
    temple: opts.temple || false,
    templeMejorado: opts.templeMejorado || false,
    dubitativo: opts.dubitativo || false,
    terrenoPredilecto: opts.terrenoPredilecto || false
  };
  if (player && player.startsWith('NPC:')) payload.targetPlayer = player;
  socket.emit('initiative:config', payload);
}

export default function InitiativePanel({ room, currentUser, isAdmin }) {
  const init = room.initiative;
  const socket = getSocket();
  const curPlayer = room.players[room.currentTurn];
  const isCurrentTurn = curPlayer === currentUser || (isAdmin && isNPC(curPlayer));

  const anyIniciativa = Object.values(init?.playerOptions || {}).some(o => o.iniciativa);

  const toggleOption = useCallback((player, option, value) => {
    if (!socket || !room) return;
    const current = init?.playerOptions?.[player] || {};
    const opts = { ...current, [option]: value };

    if (option === 'dubitativo' && value) {
      opts.rapido = false;
      opts.temple = false;
    }
    if (option === 'rapido' && value) {
      opts.dubitativo = false;
    }
    if (option === 'temple' && value) {
      opts.dubitativo = false;
      opts.templeMejorado = false;
    }
    if (option === 'templeMejorado' && value) {
      opts.temple = false;
    }

    emitOptions(socket, room.id, player, opts);
  }, [socket, room, init]);

  const handleDeal = useCallback(() => {
    if (!socket || !room) return;
    socket.emit('initiative:deal', { roomId: room.id });
  }, [socket, room]);

  const handlePick = useCallback((player, cardIndex) => {
    if (!socket || !room) return;
    const payload = { roomId: room.id, cardIndex };
    if (player && player.startsWith('NPC:')) payload.targetPlayer = player;
    socket.emit('initiative:pick', payload);
  }, [socket, room]);

  if (!init || !anyIniciativa) return null;

  return (
    <div style={{
      padding: '12px', background: 'var(--surface)', borderRadius: '12px',
      border: '1px solid var(--border)', marginTop: '12px'
    }}>
      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px', color: 'var(--text)' }}>
        Iniciativa
      </div>

      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
        Opciones de jugadores
      </div>
      {room.players.map((player) => {
        const opts = init.playerOptions?.[player] || {};
        const isMe = player === currentUser;
        const canEdit = isMe || (isAdmin && isNPC(player));
        return (
          <div key={player} style={{
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            padding: '4px 0', borderBottom: '1px solid var(--border)',
            opacity: canEdit ? 1 : 0.85
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', minWidth: '80px' }}>
              {isNPC(player) ? player.replace(/^NPC:/, '') : player}
              {isNPC(player) && <span style={{ fontSize: '10px', color: '#7b1fa2', fontWeight: 400, marginLeft: '4px' }}>(NPC)</span>}
            </span>
            {[
              { key: 'rapido', label: 'Rápido', disabled: opts.dubitativo },
              { key: 'temple', label: 'Temple', disabled: opts.dubitativo || opts.templeMejorado },
              { key: 'templeMejorado', label: 'Temple M.', disabled: opts.temple },
              { key: 'dubitativo', label: 'Dubitativo', disabled: opts.rapido || opts.temple },
              { key: 'terrenoPredilecto', label: 'Terreno Pred.' }
            ].map(opt => (
              <label key={opt.key} style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '12px', color: 'var(--text-secondary)',
                cursor: canEdit ? 'pointer' : 'default'
              }}>
                <input type="checkbox"
                  checked={opts[opt.key] || false}
                  disabled={!canEdit || opt.disabled}
                  onChange={(e) => toggleOption(player, opt.key, e.target.checked)}
                  style={{ cursor: canEdit ? 'pointer' : 'default' }} />
                {opt.label}
              </label>
            ))}
          </div>
        );
      })}

      {isCurrentTurn && (
        <button onClick={handleDeal} disabled={init.phase !== 'idle'} style={{
          marginTop: '10px', padding: '8px 20px', border: 'none', borderRadius: '8px',
          background: init.phase !== 'idle' ? 'var(--text-muted)' : 'var(--primary)',
          color: '#fff', fontSize: '14px', fontWeight: 600,
          cursor: init.phase !== 'idle' ? 'not-allowed' : 'pointer', width: '100%', opacity: init.phase !== 'idle' ? 0.6 : 1
        }}>
          {init.phase !== 'idle' ? '✓ Repartido' : 'Repartir cartas'}
        </button>
      )}

      {init.phase !== 'idle' && init.round > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
            Ronda {init.round} — Mazo: {init.deckSize} cartas
          </div>

          {room.players.map((player) => {
            const cards = init.roundCards?.[player];
            if (!cards || cards.length === 0) return null;
            const chosen = init.chosenCards?.[player];
            const needsPick = init.picking?.includes(player);
            const isMe = player === currentUser;
            const canEdit = isMe || (isAdmin && isNPC(player));
            return (
              <div key={player} style={{
                display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                padding: '3px 0', fontSize: '13px', color: 'var(--text-secondary)'
              }}>
                <span style={{ fontWeight: 600, minWidth: '80px', color: 'var(--text)' }}>
                  {isNPC(player) ? player.replace(/^NPC:/, '') : player}:
                </span>
                {cards.map((card, i) => {
                  const isChosen = chosen && card === chosen;
                  return (
                    <CardFace key={i} card={card}
                      selected={!!isChosen}
                      onClick={needsPick && canEdit ? () => handlePick(player, i) : undefined}
                    />
                  );
                })}
                {chosen && cards.length > 1 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    → escogida
                  </span>
                )}
                {needsPick && (
                  <span style={{ fontSize: '11px', color: '#f57c00', fontWeight: 600 }}>
                    {canEdit ? 'elige una carta' : 'esperando elección...'}
                  </span>
                )}
              </div>
            );
          })}

          {init.phase === 'done' && init.order?.length > 0 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                Orden de iniciativa:
              </div>
              {init.order.map((entry, i) => {
                const info = cardDisplay(entry.card);
                return (
                  <div key={entry.player} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', padding: '2px 0'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: '20px' }}>
                      {i + 1}.
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {isNPC(entry.player) ? entry.player.replace(/^NPC:/, '') : entry.player}
                    </span>
                    <CardFace card={entry.card} small />
                    {info && info.suitLabel && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ({info.suitLabel})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
