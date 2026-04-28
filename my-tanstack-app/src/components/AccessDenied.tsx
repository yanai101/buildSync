import { Icon } from './Shared';

export const AccessDenied = ({ message }: { message?: string }) => (
  <div className="page-content">
    <div className="card">
      <div className="card-body" style={{ padding: 32, textAlign: 'center' }}>
        <Icon n="alert" s={28} c="var(--danger)" />
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>אין לך גישה</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          {message ?? 'הדף הזה זמין רק לחברי צוות מורשים.'}
        </div>
      </div>
    </div>
  </div>
);

export const AccessLoading = () => (
  <div style={{ padding: 24, color: 'var(--text2)' }}>טוען...</div>
);
