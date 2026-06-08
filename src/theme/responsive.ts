import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard iPhone 11/13/14/15 size (375x812)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Horizontal scale function
 * Use for: width, marginHorizontal, paddingHorizontal, left, right, etc.
 */
export const horizontalScale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Vertical scale function
 * Use for: height, marginVertical, paddingVertical, top, bottom, etc.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderate scale function
 * Use for: fontSize, borderRadius, etc.
 * The factor (default 0.5) controls the scaling intensity.
 */
export const moderateScale = (size: number, factor = 0.5) =>
    size + (horizontalScale(size) - size) * factor;

/**
 * Utility to get responsive font size based on pixel ratio and screen size
 */
export const responsiveFontSize = (size: number) => {
    const newSize = moderateScale(size);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
