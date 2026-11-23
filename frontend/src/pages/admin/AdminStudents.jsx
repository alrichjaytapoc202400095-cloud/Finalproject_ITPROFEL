import { useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { describeError } from '../../utils/errors.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { ListSkeleton } from '../../components/ui/Skeleton.jsx';

const STATUS_TONE = { pending: 'warn', verified: 'success', rejected: 'danger', none: 'muted' };

export default function AdminStudents() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [busy, setBusy] = useState('');

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.students({ token, signal }),
    [token]
  );

  async function review(student, approve) {
    setBusy(student._id);
    try {
      await adminApi.setStudentVerification(student._id, approve, { token });
      notify(approve ? 'Student verified.' : 'Student verification rejected.', { tone: 'success' });
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  if (loading && !data) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState title="Student queue unavailable" message={describeError(error)} onRetry={refetch} />;

  const students = data || [];
  if (students.length === 0) {
    return (
      <EmptyState
        title="No verification requests"
        description="Students who submit their number, course and year appear here for review."
        icon="users"
      />
    );
  }

  return (
    <div className="stack">
      <p className="muted">
        Verified students automatically receive the store&apos;s student discount at checkout. The decision is recorded on the server.
      </p>
      {students.map((student) => (
        <article className="admin-card" key={student._id}>
          <div className="admin-card__top">
            <div>
              <h2>{student.name}</h2>
              <p className="muted">{student.email}</p>
            </div>
            <Badge tone={STATUS_TONE[student.student?.status] || 'muted'}>
              {student.student?.status || 'none'}
            </Badge>
          </div>
          <dl className="admin-card__facts">
            <div><dt>Student no.</dt><dd>{student.student?.number || '—'}</dd></div>
            <div><dt>Course</dt><dd>{student.student?.course || '—'}</dd></div>
            <div><dt>Year</dt><dd>{student.student?.year || '—'}</dd></div>
          </dl>
          <div className="admin-order-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => review(student, true)}
              disabled={busy === student._id || student.student?.status === 'verified'}
            >
              Approve
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => review(student, false)}
              disabled={busy === student._id || student.student?.status === 'rejected'}
            >
              Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
