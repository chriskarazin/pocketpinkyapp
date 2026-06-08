import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../theme';
import { moderateScale, responsiveFontSize } from '../theme/responsive';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onFinish: () => void;
}

const LOGO = require('../../assets/pinky.png');

export function WelcomeScreen({ onFinish }: WelcomeScreenProps) {
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.95))[0];
    const subFadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        // Initial reveal
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.timing(subFadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                setTimeout(() => {
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }).start(() => onFinish());
                }, 2000);
            });
        }, 1200);

        return () => { };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <Text style={styles.bgLogo}>Pink Pill</Text>

                <Animated.View style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <Image
                        source={LOGO}
                        style={styles.logo}
                        resizeMode="contain"
                    />


                    <Animated.View style={{ opacity: subFadeAnim, marginTop: spacing.xl, alignItems: 'center' }}>
                        <Text style={styles.labelCaps}>YOUR AI BIG SISTER</Text>
                    </Animated.View>
                </Animated.View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <LinearGradient
                            colors={colors.gradients.vibrant}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loaderFill}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cream,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    bgLogo: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: moderateScale(130),
        color: colors.primary,
        opacity: 0.02,
        position: 'absolute',
        top: height * 0.15,
        zIndex: 0,
    },
    logo: {
        width: moderateScale(180),
        height: moderateScale(180),
        borderRadius: moderateScale(90),
        marginBottom: spacing.xl,
    },
    content: {
        alignItems: 'center',
        zIndex: 1,
        width: '100%',
    },

    labelCaps: {
        fontFamily: 'PlayfairDisplay_700Bold',
        color: colors.gold,
        fontSize: responsiveFontSize(12),
        letterSpacing: 3,
        opacity: 0.9,
    },
    loaderContainer: {
        position: 'absolute',
        bottom: height * 0.12,
        width: '40%',
        alignItems: 'center',
    },
    loaderTrack: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    loaderFill: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
});
