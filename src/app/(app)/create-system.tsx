import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Surface } from '../../components/surface';
import { CreateSystem } from '../../screens/home/create-system';

// The create-system form: a full-screen route at every width, not a sheet or a modal. It is a form,
// not a confirm or a picker (.claude/instruction_mds/frontend.md §5).
export default function CreateSystemScreen() {
  return (
    <Surface style={styles.screen}>
      <CreateSystem onDismiss={() => router.back()} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
