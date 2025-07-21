import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const StatusBadge = ({ status, text, size = 'medium' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return colors.driver.online;
      case 'offline':
        return colors.driver.offline;
      case 'busy':
        return colors.driver.busy;
      case 'earning':
        return colors.driver.earnings;
      default:
        return colors.driver.offline;
    }
  };

  return (
    <View style={[
      styles.badge, 
      styles[size],
      { backgroundColor: getStatusColor() }
    ]}>
      <Text style={[styles.text, styles[`${size}Text`]]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  small: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minHeight: 20,
  },
  
  medium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 24,
  },
  
  large: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 32,
  },
  
  text: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  
  smallText: {
    fontSize: typography.sizes.xs,
  },
  
  mediumText: {
    fontSize: typography.sizes.sm,
  },
  
  largeText: {
    fontSize: typography.sizes.md,
  },
});

export default StatusBadge;