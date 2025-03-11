import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AlertCircle size={20} color="#CC0000" />
        <Text style={styles.message}>{message}</Text>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <X size={20} color="#666666" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  message: {
    color: '#CC0000',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
});