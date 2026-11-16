import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../src/constants/theme';

export default function Screen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Thêm món</Text>
      <Text style={styles.msg}>Chọn ảnh từ thư viện để thêm món vào tủ. Có ở bản sau.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  msg: { fontSize: 15, color: colors.muted, marginTop: spacing.sm, lineHeight: 22 },
});
