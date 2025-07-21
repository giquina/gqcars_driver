import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  style,
  textStyle 
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle
  ];

  return (
    <TouchableOpacity 
      style={buttonStyles} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primary: {
    backgroundColor: colors.primary,
  },
  
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  success: {
    backgroundColor: colors.success,
  },
  
  danger: {
    backgroundColor: colors.danger,
  },
  
  transparent: {
    backgroundColor: 'transparent',
  },
  
  surface: {
    backgroundColor: colors.surface,
  },
  
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  text: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  
  primaryText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
  },
  
  secondaryText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
  },
  
  successText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
  },
  
  dangerText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
  },
  
  transparentText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
  },
  
  surfaceText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
  },
  
  smallText: {
    fontSize: typography.sizes.sm,
  },
  
  mediumText: {
    fontSize: typography.sizes.md,
  },
  
  largeText: {
    fontSize: typography.sizes.lg,
  },
  
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;