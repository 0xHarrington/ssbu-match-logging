// Shared loading / error feedback components (Gruvbox themed, no dependencies).

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--gray)',
        fontSize: '1rem',
        textAlign: 'center',
      }}
    >
      <style>
        {`@keyframes feedback-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }`}
      </style>
      <span style={{ animation: 'feedback-pulse 1.5s ease-in-out infinite' }}>
        {label}
      </span>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--red)', fontSize: '1rem' }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg1)',
            color: 'var(--fg)',
            border: '1px solid var(--bg-light)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background var(--transition-speed)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg1)';
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
