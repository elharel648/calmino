import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay, 
    Easing, 
    runOnJS, 
    useAnimatedProps 
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedSplashScreenProps {
    onAnimationComplete: () => void;
    isReadyToStart: boolean;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onAnimationComplete, isReadyToStart }) => {
    const { theme } = useTheme();
    const progress = useSharedValue(0);
    const fillProgress = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (isReadyToStart) {
            // Draw the exact geometric outlines of the authentic logo over 1500ms
            progress.value = withDelay(150, withTiming(1, {
                duration: 1500,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }, (finished) => {
                if (finished) {
                    // Fill the logo softly to "connect to perfection"
                    fillProgress.value = withTiming(1, {
                        duration: 800,
                        easing: Easing.inOut(Easing.ease)
                    }, (fillFinished) => {
                        if (fillFinished) {
                            // Tactile feedback EXACTLY when image forms
                            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                            
                            // Cinematic dive-in: Scale the icon outwards as the view fades
                            scale.value = withTiming(1.3, {
                                duration: 1000,
                                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
                            });

                            // Fade out the entire splash screen
                            opacity.value = withDelay(400, withTiming(0, {
                                duration: 600,
                                easing: Easing.out(Easing.ease)
                            }, (fadeFinished) => {
                                if (fadeFinished) {
                                    runOnJS(onAnimationComplete)();
                                }
                            }));
                        }
                    });
                }
            }));
        }
    }, [isReadyToStart]);

    const overlayStyle = useAnimatedStyle(() => {
        return { 
            opacity: opacity.value,
            transform: [{ scale: scale.value }]
        };
    });

    // The length of the potrace geometric outline path is roughly 11000 units
    const TOTAL_LENGTH = 15000; 

    // Animate the stroke drawing and the fill filling
    const animatedProps = useAnimatedProps(() => {
        return { 
            strokeDashoffset: TOTAL_LENGTH - TOTAL_LENGTH * progress.value,
            fillOpacity: fillProgress.value
        };
    });

    return (
        <Animated.View style={[styles.container, { backgroundColor: theme.background }, overlayStyle]} pointerEvents="none">
            {/* Center the logo precisely, expanded minimalist size (150px) */}
            <Svg width="150" height="150" viewBox="280 270 440 480" style={{ transform: [{ translateY: -30 }] }}>
                <AnimatedPath
                    animatedProps={animatedProps}
                    d="M 475 296.199 C 460.131 297.586, 440.210 304.201, 426.486 312.310 C 415.846 318.596, 410.503 322.395, 397.500 332.915 C 358.656 364.344, 325.284 419.078, 311.540 473.901 C 305.410 498.355, 303.513 513.634, 303.581 538 C 303.635 557.070, 303.942 561.026, 306.300 573 C 312.844 606.237, 323.758 630.387, 343.584 655.500 C 359.064 675.108, 372.316 686.811, 398.500 703.997 C 409.332 711.106, 433.873 721.773, 447.763 725.409 C 497.145 738.336, 547.327 732.385, 592 708.303 C 635.567 684.818, 671.966 641.610, 686.916 595.630 C 693.002 576.914, 695.116 565.568, 695.711 548.430 C 696.164 535.363, 695.959 532.273, 694.164 525.178 C 687.181 497.561, 662.482 479, 632.718 479 C 619.850 479, 610.441 481.224, 600 486.734 C 583.518 495.431, 571.605 507.854, 564.187 524.081 C 559.171 535.052, 557.815 540.808, 557.140 554 L 556.500 566.500 547.948 567.152 C 526.418 568.795, 503.524 575.256, 482.064 585.747 L 472.627 590.360 465.713 582.930 C 453.116 569.393, 441.412 549.527, 435.676 531.947 C 430.989 517.581, 429.600 508.526, 429.548 492 L 429.500 476.500 432.500 476.687 C 456.196 478.168, 463.004 478.152, 471.914 476.592 C 495.253 472.506, 513.143 463.050, 530.572 445.589 C 551.299 424.822, 562.999 398.033, 563 371.338 C 563 357.666, 558.580 340.837, 552.891 332.846 C 551.851 331.386, 551 329.649, 551 328.986 C 551 328.323, 546.837 323.661, 541.750 318.627 C 531.419 308.405, 521.447 302.422, 508.696 298.797 C 500.140 296.365, 485.407 295.229, 475 296.199 M 470 308.511 C 456.607 310.844, 438.050 318.288, 424.681 326.690 C 400.689 341.768, 372.145 371.771, 355.612 399.289 C 335.166 433.319, 323.974 463.740, 317.454 503 C 315.538 514.536, 314.195 552.615, 315.738 551.662 C 316.307 551.310, 317.072 549.430, 317.437 547.483 C 318.527 541.675, 321.649 532.629, 325.265 524.802 C 340.484 491.864, 371.705 468.259, 405.757 463.948 C 414.804 462.802, 431.469 463.467, 435.898 465.151 C 437.244 465.663, 444.681 466.111, 452.423 466.147 C 463.395 466.197, 468.485 465.747, 475.500 464.105 C 485.088 461.861, 495.796 457.832, 500.154 454.829 C 501.614 453.823, 503.108 453, 503.474 453 C 503.840 453, 507.820 450.120, 512.320 446.600 C 533.382 430.121, 546.959 407.636, 550.639 383.139 C 553.963 361.018, 548.384 341.492, 534.649 327.176 C 518.956 310.818, 495.551 304.061, 470 308.511 M 398.500 477.005 C 381.244 481.525, 366.903 489.914, 354.180 502.927 C 340.770 516.643, 331.633 534.252, 327.569 554.208 C 325.785 562.974, 325.487 583.249, 327.007 592.610 C 328.409 601.248, 333.634 617.261, 337.740 625.500 C 345.581 641.236, 363.148 662.400, 380.068 676.496 C 391.754 686.231, 417.379 702.955, 418.655 701.679 C 418.998 701.335, 418.012 699.393, 416.464 697.363 C 414.915 695.333, 412.338 690.484, 410.737 686.586 C 405.903 674.820, 406.921 659.978, 413.487 646.500 C 419.241 634.690, 435.812 616.654, 452.613 603.914 C 457.776 600, 462 596.568, 462 596.289 C 462 596.009, 459.678 593.242, 456.840 590.140 C 444.012 576.118, 434.348 560.284, 426.986 541.225 C 420.239 523.756, 416.720 501.411, 417.779 482.750 L 418.219 475 411.859 475.086 C 408.362 475.133, 402.350 475.997, 398.500 477.005 M 621.105 491.082 C 609.363 493.388, 595.191 501.710, 586.085 511.649 C 579.334 519.016, 572.915 530.625, 570.570 539.708 C 568.767 546.692, 568.325 557.993, 569.438 568.665 C 570.125 575.250, 570.022 575.918, 568.159 576.915 C 567.044 577.512, 563.424 578, 560.115 578 C 556.806 578, 551.714 578.502, 548.799 579.116 C 531.939 582.666, 518.011 596.870, 518.025 610.500 C 518.033 618.591, 519.223 619.877, 529.664 623.066 C 543.437 627.273, 552.870 628.321, 571.825 627.748 C 586.303 627.310, 590.053 626.834, 600.288 624.129 C 606.772 622.417, 613.972 620.158, 616.288 619.111 C 618.605 618.064, 622.075 616.550, 624 615.748 C 640.500 608.867, 661.018 591.845, 672.353 575.635 C 693 546.107, 686.895 512.156, 658.161 496.709 C 647.168 490.799, 633.283 488.691, 621.105 491.082 M 506 587.859 C 493.978 592.262, 483.040 597.405, 483.019 598.665 C 482.992 600.322, 503.714 613.324, 505.370 612.688 C 506.221 612.362, 506.776 610.513, 506.830 607.824 C 506.941 602.307, 509.144 596.058, 512.985 590.368 C 514.643 587.910, 516 585.697, 516 585.450 C 516 584.534, 513.309 585.182, 506 587.859 M 667.447 599.092 C 641.382 625.434, 604.936 640.001, 565.091 640 C 544.300 639.999, 518.286 633.587, 500.440 624.064 C 490.073 618.532, 477.395 610.216, 474.595 607.112 C 473.547 605.950, 472.153 605, 471.498 605 C 469.320 605, 452.637 618.200, 443.165 627.416 C 433.353 636.965, 424.597 649.096, 421.452 657.500 C 420.231 660.764, 419.584 665.104, 419.588 670 C 419.602 683.462, 424.229 692.292, 436.199 701.698 C 444.735 708.406, 451.001 711.744, 460.500 714.646 C 484.553 721.993, 505.164 722.615, 534.823 716.892 C 582.895 707.615, 626.632 677.557, 655.439 634 C 663.559 621.722, 677.344 593.011, 675.841 591.508 C 675.595 591.262, 671.817 594.674, 667.447 599.092"
                    stroke={theme.primary}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={TOTAL_LENGTH}
                    fill={theme.primary}
                />
            </Svg>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999999,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AnimatedSplashScreen;
