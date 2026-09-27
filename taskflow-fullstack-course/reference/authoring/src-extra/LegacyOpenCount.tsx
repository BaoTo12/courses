// 17.12 (＋): the same "open tasks" badge written the LEGACY way, with connect().
// For reading older code only: new code uses hooks (OpenTasksBadge.tsx).
import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { RootState } from '../../app/rootReducer';
import { selectionCleared } from '../ui/uiSlice';
import { selectOpenTaskCount } from './tasksSlice';

/** State → props. Runs after every dispatch; the component re-renders if the result is shallowly different. */
const mapStateToProps = (state: RootState) => ({
  openCount: selectOpenTaskCount(state),
  selectedCount: state.ui.selectedTaskIds.length,
});

/** Object shorthand: each action creator is wrapped in dispatch and passed as a prop. */
const mapDispatchToProps = { onClearSelection: selectionCleared };

const connector = connect(mapStateToProps, mapDispatchToProps);

/** The props the connected component receives: inferred from the connector. */
type Props = ConnectedProps<typeof connector>;

function LegacyOpenCountView({ openCount, selectedCount, onClearSelection }: Props) {
  return (
    <span>
      {openCount} open · {selectedCount} selected{' '}
      <button type="button" onClick={onClearSelection}>
        Clear selection
      </button>
    </span>
  );
}

export const LegacyOpenCount = connector(LegacyOpenCountView);
