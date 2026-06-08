import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { supabase } from '../services/supabase';
import { emailService } from '../services/email';

interface ForgotPasswordModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

export function ForgotPasswordModal({ visible, onClose, onSuccess, onError }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handlePasswordReset() {
        if (!email) {
            onError('Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            onError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const recoveryLink = `${process.env.EXPO_PUBLIC_VETTING_APP_URL}/auth/reset-password?email=${email}`;
            const result = await emailService.sendPasswordResetEmail(email, recoveryLink);

            if (!result.success) throw new Error(result.error);

            onSuccess('Reset link sent!');
            setEmail('');
            onClose();
        } catch (error: any) {
            onError(error?.message ?? 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <BlurView intensity={20} tint="light" style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>RESET PASSWORD</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Feather name="x" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.instructionText}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.labelCaps}>EMAIL ADDRESS</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="queen@example.com"
                                placeholderTextColor="rgba(61,58,55,0.3)"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handlePasswordReset}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={colors.gradients.vibrant}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.warmWhite} />
                                ) : (
                                    <>
                                        <Feather name="send" size={16} color={colors.warmWhite} />
                                        <Text style={styles.buttonText}>SEND RESET LINK</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(45,42,39,0.4)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        width: '90%',
        maxWidth: horizontalScale(400),
        backgroundColor: colors.cream,
        borderRadius: 24,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
        shadowColor: colors.charcoal,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 15,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.labelCaps,
        color: colors.gold,
        fontSize: responsiveFontSize(16),
        letterSpacing: 2,
    },
    closeButton: {
        padding: spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
    },
    modalBody: {
        gap: spacing.lg,
    },
    instructionText: {
        ...typography.body,
        color: colors.textSecondary,
        opacity: 0.8,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        marginBottom: spacing.xs,
    },
    inputWrapper: {
        gap: 6,
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.gold,
        fontSize: responsiveFontSize(11),
        letterSpacing: 1.5,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: radii.input,
        paddingHorizontal: spacing.md,
        height: verticalScale(45),
        color: colors.textPrimary,
        ...typography.body,
        lineHeight: undefined, // Fixes vertical centering
        textAlignVertical: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        fontSize: responsiveFontSize(14),
    },
    button: {
        marginTop: spacing.md,
        shadowColor: colors.pinkAccent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonGradient: {
        padding: spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    buttonText: {
        ...typography.labelCaps,
        color: colors.warmWhite,
        fontSize: responsiveFontSize(14),
        letterSpacing: 2,
        fontWeight: '700',
    },
});
