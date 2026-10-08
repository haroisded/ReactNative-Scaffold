import { router } from 'expo-router';

import { DeleteAccountDialog } from '../../../components/delete-account-dialog';

// Confirm deleting the account on a narrow container (.claude/instruction_mds/frontend.md §5).
export default function DeleteAccountSheet() {
  return <DeleteAccountDialog inSheet onDismiss={() => router.back()} />;
}
