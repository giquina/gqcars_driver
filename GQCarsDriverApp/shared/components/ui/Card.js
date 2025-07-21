import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

const Card = ({ children, style, padding = 'md' }) => {
  return (
    <View style={[styles.card, styles[padding], style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  sm: {
    padding: spacing.sm,
  },
  
  md: {
    padding: spacing.md,
  },
  
  lg: {
    padding: spacing.lg,
  },
});

export default Card;