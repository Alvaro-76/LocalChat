import React, { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, onConfirm, icon, title, subtitle, children, confirmText, cancelText, type }) {
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const input = modalRef.current?.querySelector('input');
      if (input) input.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && onConfirm) onConfirm();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const iconBg = type === 'danger' ? '#FFEBEE' : type === 'confirm' ? '#E8F5E9' : '#FFF3E0';
  const confirmBg = type === 'danger' ? 'var(--danger)' : 'var(--gradient-btn)';

  const s = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      animation: 'modalFadeIn 0.2s ease-out'
    },
    modal: {
      background: 'var(--surface)', borderRadius: '16px', width: '380px',
      maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
      animation: 'modalScaleIn 0.2s ease-out', overflow: 'hidden'
    },
    header: {
      padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '12px'
    },
    iconBox: {
      width: '40px', height: '40px', borderRadius: '10px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      flexShrink: 0, background: iconBg
    },
    titleText: { fontSize: '16px', fontWeight: 600, color: 'var(--text)' },
    subtitleText: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' },
    body: { padding: '16px 24px' },
    footer: {
      padding: '12px 24px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end'
    },
    btn: {
      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
      cursor: 'pointer', border: 'none', transition: 'all 0.15s'
    },
    btnCancel: {
      background: 'var(--surface-hover)', color: 'var(--text-secondary)',
      border: '1px solid var(--border)'
    },
    btnConfirm: {
      background: confirmBg, color: '#fff',
      boxShadow: type !== 'danger' ? '0 2px 8px rgba(79,108,247,0.25)' : 'none'
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalScaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
      <div style={s.modal} ref={modalRef}>
        <div style={s.header}>
          <div style={s.iconBox}>{icon || '🔒'}</div>
          <div>
            <div style={s.titleText}>{title}</div>
            {subtitle && <div style={s.subtitleText}>{subtitle}</div>}
          </div>
        </div>
        <div style={s.body}>{children}</div>
        <div style={s.footer}>
          <button style={{ ...s.btn, ...s.btnCancel }} onClick={onClose}>
            {cancelText || 'Cancelar'}
          </button>
          {onConfirm && (
            <button style={{ ...s.btn, ...s.btnConfirm }} onClick={onConfirm}>
              {confirmText || 'Aceptar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PasswordModal({ isOpen, onClose, onConfirm, channelName }) {
  const [password, setPassword] = React.useState('');

  useEffect(() => {
    if (isOpen) setPassword('');
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(password)}
      icon="🔒"
      title={`Unirse a #${channelName || ''}`}
      subtitle="Ingresa la contraseña para acceder"
      confirmText="Unirse"
      cancelText="Cancelar"
    >
      <input
        type="password"
        style={{
          width: '100%', padding: '12px 16px', border: '2px solid var(--border)',
          borderRadius: '10px', fontSize: '14px', background: 'var(--surface-hover)',
          color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif'
        }}
        placeholder="Contraseña del canal..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        🔒 Este canal está protegido con contraseña
      </div>
    </Modal>
  );
}

export function InviteModal({ isOpen, onClose, onConfirm, from, name, type }) {
  const isRoom = type === 'sala';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={isRoom ? '🎲' : '#'}
      title={isRoom ? 'Invitación a sala' : 'Invitación a canal'}
      subtitle={`${from} te ha invitado`}
      confirmText="Unirse"
      cancelText="Rechazar"
      type="confirm"
    >
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
        <strong>{from}</strong> te ha invitado a la {isRoom ? 'sala' : 'canal'} "<strong>{name}</strong>".
        <br /><br />¿Deseas unirte?
      </p>
    </Modal>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, type }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={type === 'danger' ? '⚠️' : '❓'}
      title={title || 'Confirmar'}
      subtitle={null}
      confirmText={confirmText || 'Aceptar'}
      cancelText="Cancelar"
      type={type}
    >
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
        {message}
      </p>
    </Modal>
  );
}
