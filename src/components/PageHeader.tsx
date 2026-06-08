import { StyleSheet, Text, View, Platform, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { responsiveFontSize, moderateScale } from '../theme/responsive';
import { Feather } from '@expo/vector-icons';

const LOGO = require('../../assets/pinky.png');

interface PageHeaderProps {
    title?: string;
    rightIcon?: string;
    onRightPress?: () => void;
    leftIcon?: string;
    onLeftPress?: () => void;
}

export function PageHeader({ title, rightIcon, onRightPress, leftIcon, onLeftPress }: PageHeaderProps) {
    const insets = useSafeAreaInsets();
    const Container = Platform.OS === 'ios' ? BlurView : View;

    return (
        <View style={styles.outerContainer}>
            <Container
                tint="light"
                intensity={85}
                style={[
                    styles.container,
                    { paddingTop: insets.top }
                ]}
            >
                <View style={styles.content}>
                    {/* Left button */}
                    <View style={styles.sideWrapper}>
                        {leftIcon && onLeftPress && (
                            <TouchableOpacity
                                onPress={onLeftPress}
                                style={styles.iconButton}
                                activeOpacity={0.7}
                            >
                                <Feather name={leftIcon as any} size={22} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Centre logo + wordmark */}
                    <View style={styles.centreBlock} pointerEvents="none">
                        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                        <Text style={styles.wordmark}>Pink Pill</Text>
                    </View>

                    {/* Right button */}
                    <View style={[styles.sideWrapper, { alignItems: 'flex-end' }]}>
                        {rightIcon && onRightPress && (
                            <TouchableOpacity
                                onPress={onRightPress}
                                style={styles.iconButton}
                                activeOpacity={0.7}
                            >
                                <Feather name={rightIcon as any} size={22} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    container: {
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 252, 249, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(237, 232, 227, 0.8)',
    },
    content: {
        height: moderateScale(56),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    sideWrapper: {
        width: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    iconButton: {
        padding: 8,
        marginLeft: -8,
    },
    centreBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    logo: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    wordmark: {
        fontFamily: 'Allura_400Regular',
        color: colors.primary,
        fontSize: responsiveFontSize(28),
        lineHeight: 34,
        overflow: 'visible',
    },
});
