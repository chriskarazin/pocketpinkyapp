import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export function ConfirmationModal({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = true,
}: ConfirmationModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onCancel}
                />
                <BlurView intensity={30} tint="light" style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, isDestructive && styles.destructiveIconCircle]}>
                            <Feather
                                name={isDestructive ? "trash-2" : "help-circle"}
                                size={24}
                                color={isDestructive ? colors.pinkAccent : colors.gold}
                            />
                        </View>
                    </View>

                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmButton, isDestructive && styles.destructiveConfirmButton]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(45, 42, 39, 0.4)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        width: '85%',
        maxWidth: horizontalScale(340),
        backgroundColor: colors.cream,
        borderRadius: 24,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: colors.charcoal,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: spacing.lg,
    },
    iconCircle: {
        width: moderateScale(56),
        height: moderateScale(56),
        borderRadius: moderateScale(28),
        backgroundColor: 'rgba(201, 165, 92, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 165, 92, 0.15)',
    },
    destructiveIconCircle: {
        backgroundColor: 'rgba(212, 115, 122, 0.1)',
        borderColor: 'rgba(212, 115, 122, 0.15)',
    },
    modalTitle: {
        ...typography.labelCaps,
        color: colors.textPrimary,
        fontSize: responsiveFontSize(16),
        textAlign: 'center',
        marginBottom: spacing.sm,
        letterSpacing: 1.5,
    },
    modalMessage: {
        ...typography.body,
        color: colors.textSecondary,
        opacity: 0.8,
        fontSize: responsiveFontSize(14),
        textAlign: 'center',
        lineHeight: responsiveFontSize(20),
        marginBottom: spacing.xl,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    cancelButtonText: {
        ...typography.labelCaps,
        color: colors.textSecondary,
        fontSize: responsiveFontSize(12),
        letterSpacing: 1,
    },
    confirmButton: {
        flex: 1.2,
        paddingVertical: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.charcoal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    destructiveConfirmButton: {
        backgroundColor: colors.pinkAccent,
        shadowColor: colors.pinkAccent,
    },
    confirmButtonText: {
        ...typography.labelCaps,
        color: colors.warmWhite,
        fontSize: responsiveFontSize(12),
        fontWeight: '700',
        letterSpacing: 1,
    },
});
