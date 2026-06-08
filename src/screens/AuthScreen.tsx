import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii } from '../theme';
import { moderateScale, verticalScale, horizontalScale, responsiveFontSize } from '../theme/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ForgotPasswordModal } from '../components';
import { supabase } from '../services/supabase';
import { Feather } from '@expo/vector-icons';

const LOGO = require('../../assets/pinky.png');

export function AuthScreen() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [isSignUp, setIsSignUp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // Password Validation Regex: At least 8 chars, 1 uppercase, 1 special char
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.{8,})/;
    const insets = useSafeAreaInsets();

    async function handleAuth() {
        if (!email || !password) {
            setToast({ message: 'Please fill in all fields', type: 'error', visible: true });
            return;
        }

        if (isSignUp) {
            if (!name) {
                setToast({ message: 'Please enter your name', type: 'error', visible: true });
                return;
            }
            if (password !== confirmPassword) {
                setToast({ message: 'Passwords do not match', type: 'error', visible: true });
                return;
            }
            if (!passwordRegex.test(password)) {
                setToast({
                    message: 'Password must be at least 8 characters, 1 uppercase, and 1 special character (!@#$&*).',
                    type: 'error',
                    visible: true,
                });
                return;
            }
        }

        setLoading(true);
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });
            if (error) setToast({ message: error.message, type: 'error', visible: true });
            else setToast({ message: 'Check your email for the confirmation link!', type: 'success', visible: true });
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setToast({ message: error.message, type: 'error', visible: true });
        }
        setLoading(false);
    }



    return (
        <View style={styles.container}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
            <ForgotPasswordModal
                visible={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
                onSuccess={(message) => setToast({ message, type: 'success', visible: true })}
                onError={(message) => setToast({ message, type: 'error', visible: true })}
            />
            <LinearGradient
                colors={[colors.cream, colors.blush]}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            {
                                paddingTop: insets.top + spacing.xl,
                                paddingBottom: Math.max(insets.bottom, spacing.xxl),
                            }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <Image
                                source={LOGO}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.editorialHeadline}>
                                {isSignUp ? 'Join the' : 'Welcome back to'}
                                {'\n'}
                                <Text style={{ color: colors.pinkAccent }}>Pinky.</Text>
                            </Text>
                            <Text style={styles.subheadline}>
                                {isSignUp
                                    ? 'Start your journey with your AI companion.'
                                    : 'Log in to access your elite vetting tools.'}
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {isSignUp && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.labelCaps}>FULL NAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Jessica Smith"
                                        placeholderTextColor="rgba(61,58,55,0.3)"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}

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
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.labelCaps}>PASSWORD</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(61,58,55,0.3)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            {isSignUp && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.labelCaps}>CONFIRM PASSWORD</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(61,58,55,0.3)"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>
                            )}

                            {!isSignUp && (
                                <TouchableOpacity
                                    style={styles.forgotPasswordButton}
                                    onPress={() => setShowForgotPassword(true)}
                                >
                                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleAuth}
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
                                        <Text style={styles.buttonText}>
                                            {isSignUp ? 'REGISTER' : 'SIGN IN'}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.switchButton}
                                onPress={() => setIsSignUp(!isSignUp)}
                            >
                                <Text style={styles.switchText}>
                                    {isSignUp
                                        ? 'Already have an account? Sign In'
                                        : "New here? Create an account"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: {
        padding: spacing.xl,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: verticalScale(40),
        alignItems: 'center',
    },
    logo: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        marginBottom: spacing.md,
    },
    editorialHeadline: {
        ...typography.display,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    subheadline: {
        ...typography.body,
        color: colors.textSecondary,
        opacity: 0.8,
        marginTop: spacing.md,
        textAlign: 'center',
        maxWidth: '90%',
    },
    form: {
        gap: spacing.lg,
    },
    inputWrapper: {
        gap: 6,
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.gold,
        fontSize: responsiveFontSize(11),
        letterSpacing: 2,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: radii.input,
        paddingHorizontal: spacing.md,
        height: verticalScale(50),
        color: colors.textPrimary,
        ...typography.body,
        lineHeight: undefined, // Fixes vertical centering
        textAlignVertical: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        fontSize: responsiveFontSize(15),
    },
    button: {
        marginTop: spacing.xl,
        shadowColor: colors.pinkAccent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonGradient: {
        padding: spacing.xl,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        ...typography.labelCaps,
        color: colors.warmWhite,
        fontSize: responsiveFontSize(15),
        letterSpacing: 3,
        fontWeight: '700',
    },
    switchButton: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    switchText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: -spacing.xs,
    },
    forgotPasswordText: {
        ...typography.bodySmall,
        color: colors.pinkAccent,
        fontSize: responsiveFontSize(13),
        fontWeight: '600',
    },

});
