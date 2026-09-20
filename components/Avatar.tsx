import { View, Text, StyleSheet } from 'react-native';
import { getInitials } from '@/lib/colors';

type AvatarProps = {
  name: string | null | undefined;
  color: string;
  size?: number;
};

export function Avatar({ name, color, size = 36 }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const fontSize = Math.max(size * 0.4, 12);
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
