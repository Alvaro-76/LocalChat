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
      borderTop: '1px solid #0f3460', background: '#16213e',
      position: 'relative'
    },
    form: {
      display: 'flex', gap: '8px', padding: '12px 16px',
      alignItems: 'center'
    },
    emojiBtn: {
      background: 'none', border: 'none', fontSize: '22px',
      cursor: 'pointer', padding: '6px', borderRadius: '8px',
      lineHeight: 1, transition: 'all 0.15s',
      opacity: showEmojis ? 1 : 0.6
    },
    fileBtn: {
      background: 'none', border: 'none', fontSize: '20px',
      cursor: 'pointer', padding: '6px', borderRadius: '8px',
      lineHeight: 1, opacity: 0.8
    },
    input: {
      flex: 1, padding: '10px 14px', border: '1px solid #0f3460',
      borderRadius: '8px', fontSize: '15px', background: '#1a1a2e',
      color: '#eee', outline: 'none'
    },
    button: {
      padding: '10px 20px', border: 'none', borderRadius: '8px',
      background: '#e94560', color: '#fff', fontSize: '15px',
      fontWeight: 600, cursor: 'pointer'
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
          style={styles.emojiBtn}
          onClick={() => setShowEmojis(!showEmojis)}
          title="Emojis"
        >
          😊
        </button>
        <button
          type="button"
          style={styles.fileBtn}
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
