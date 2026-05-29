import React, { useState, useRef, useCallback } from 'react';
import EmojiPicker from './EmojiPicker';
import { getSocket } from '../services/socket';

export default function ChatInput({ onSend, onFileUpload, placeholder, typingTo }) {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const cursorRef = useRef(0);
  const typingTimerRef = useRef(null);
  const wasTypingRef = useRef(false);

  const emitTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (!socket) return;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    socket.emit(event, { to: typingTo || null });
  }, [typingTo]);

  function handleTextChange(value, cursorPos) {
    setText(value);
    cursorRef.current = cursorPos;

    if (value.trim().length > 0) {
      if (!wasTypingRef.current) {
        wasTypingRef.current = true;
        emitTyping(true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        wasTypingRef.current = false;
        emitTyping(false);
      }, 2000);
    } else {
      if (wasTypingRef.current) {
        wasTypingRef.current = false;
        emitTyping(false);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (wasTypingRef.current) {
      wasTypingRef.current = false;
      emitTyping(false);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }

  function handleEmojiSelect(emoji) {
    const before = text.slice(0, cursorRef.current);
    const after = text.slice(cursorRef.current);
    const newText = before + emoji + after;
    setText(newText);
    cursorRef.current = cursorRef.current + emoji.length;
    inputRef.current?.focus();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileUpload(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const renamed = new File([file], `captura-${Date.now()}.png`, { type: file.type });
          onFileUpload(renamed);
          return;
        }
      }
    }
  }

  const styles = {
    wrapper: {
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      position: 'relative'
    },
    form: {
      display: 'flex', gap: '6px', padding: '10px 16px',
      alignItems: 'center'
    },
    iconBtn: {
      background: 'none', border: 'none', fontSize: '20px',
      cursor: 'pointer', padding: '8px', borderRadius: '50%',
      lineHeight: 1, opacity: 0.6, transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    input: {
      flex: 1, padding: '10px 16px', border: '2px solid var(--border)',
      borderRadius: '24px', fontSize: '14px', background: 'var(--input-bg)',
      color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s'
    },
    button: {
      padding: '10px 20px', border: 'none', borderRadius: '24px',
      background: 'var(--gradient-btn)',
      color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
      transition: 'opacity 0.15s'
    }
  };

  return (
    <div
      style={styles.wrapper}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {showEmojis && (
        <EmojiPicker onSelect={handleEmojiSelect} />
      )}
      <form style={styles.form} onSubmit={handleSubmit}>
        <button
          type="button"
          style={styles.iconBtn}
          onClick={() => setShowEmojis(!showEmojis)}
          title="Emojis"
        >
          😊
        </button>
        <button
          type="button"
          style={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          title="Adjuntar archivo"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder || 'Escribe un mensaje...'}
          value={text}
          onChange={(e) => {
            handleTextChange(e.target.value, e.target.selectionStart || 0);
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          onSelect={(e) => {
            cursorRef.current = e.target.selectionStart || 0;
          }}
          onPaste={handlePaste}
        />
        <button style={styles.button} type="submit">Enviar</button>
      </form>
    </div>
  );
}
