// SeeAllModal — every match in the session, scrollable, each row editable.
import ModalShell from './ModalShell';
import MatchRow from './MatchRow';
import type { Match } from '../../types';

interface SeeAllModalProps {
  sessionName: string;
  matches: Match[];
  onClose: () => void;
  onEdit: (match: Match) => void;
}

export default function SeeAllModal({ sessionName, matches, onClose, onEdit }: SeeAllModalProps) {
  return (
    <ModalShell
      width={640}
      maxHeight={600}
      bodyScroll
      title="Session Matches"
      subtitle={`${sessionName} · ${matches.length} games · tap ✎ to edit`}
      onClose={onClose}
    >
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {matches.map((m) => (
          <MatchRow key={m.match_id} match={m} onEdit={onEdit} />
        ))}
      </div>
    </ModalShell>
  );
}
