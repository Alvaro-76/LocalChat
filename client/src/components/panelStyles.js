export const panelHeaderStyle = {
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

export const panelItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  cursor: 'pointer',
  borderRadius: 8,
  margin: '0 6px',
  transition: 'all 0.15s ease',
  fontSize: 14,
  fontWeight: 500,
  userSelect: 'none',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  width: 'calc(100% - 12px)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

export const panelItemHover = {
  background: 'var(--surface-hover)'
};

export const panelItemActive = {
  background: 'var(--surface-active)',
  color: 'var(--primary)'
};

export const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 0'
};

export const dotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0
};

export const lockIconStyle = {
  fontSize: 12,
  color: 'var(--text-muted)',
  marginLeft: 'auto',
  flexShrink: 0
};
