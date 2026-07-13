/**
 * apps/mobile/__mocks__/react-native-reanimated.js
 *
 * Mock manual de react-native-reanimated para Jest.
 * Reanimated v4 + react-native-worklets require native code que no existe en Jest.
 * Este mock reemplaza todas las funciones con implementaciones JS puras.
 *
 * Referencias: https://docs.swmansion.com/react-native-reanimated/docs/guides/testing
 * Story 2.3 — permite testear componentes que usan Reanimated sin crash.
 */

const React = require('react');
const { View, Text, Image, ScrollView, FlatList } = require('react-native');

// Animated.View, Animated.Text, etc. — simplemente envuelven los componentes nativos
const AnimatedView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
const AnimatedText = React.forwardRef((props, ref) => React.createElement(Text, { ...props, ref }));
const AnimatedImage = React.forwardRef((props, ref) => React.createElement(Image, { ...props, ref }));
const AnimatedScrollView = React.forwardRef((props, ref) => React.createElement(ScrollView, { ...props, ref }));
const AnimatedFlatList = React.forwardRef((props, ref) => React.createElement(FlatList, { ...props, ref }));

AnimatedView.displayName = 'Animated.View';
AnimatedText.displayName = 'Animated.Text';

// Shared values — objetos simples con .value
function useSharedValue(initialValue) {
  const ref = React.useRef(initialValue);
  return ref.current !== undefined ? { value: ref.current } : { value: initialValue };
}

// useAnimatedStyle — devuelve el estilo estático (sin animación en tests)
function useAnimatedStyle(worklet) {
  try {
    return worklet() || {};
  } catch {
    return {};
  }
}

// Animaciones — devuelven el valor directamente (sin animación en tests)
const withSpring = (value) => value;
const withTiming = (value, _config, callback) => {
  if (callback) callback(true);
  return value;
};
const withDelay = (_, animation) => animation;
const withSequence = (...animations) => animations[animations.length - 1];
const withRepeat = (animation) => animation;

// runOnJS — simplemente devuelve la función (en tests todo corre en JS thread)
const runOnJS = (fn) => fn;

// interpolate — cálculo lineal simple
function interpolate(value, inputRange, outputRange, extrapolate) {
  const inputMin = inputRange[0];
  const inputMax = inputRange[inputRange.length - 1];
  const outputMin = outputRange[0];
  const outputMax = outputRange[outputRange.length - 1];

  if (value <= inputMin) {
    return extrapolate === 'clamp' ? outputMin : outputMin;
  }
  if (value >= inputMax) {
    return extrapolate === 'clamp' ? outputMax : outputMax;
  }

  const ratio = (value - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
}

// interpolateColor — devuelve el color del extremo más cercano
function interpolateColor(value, inputRange, outputRange) {
  const inputMin = inputRange[0];
  const inputMax = inputRange[inputRange.length - 1];
  if (value <= inputMin) return outputRange[0];
  if (value >= inputMax) return outputRange[outputRange.length - 1];
  return outputRange[0];
}

// Otros hooks / APIs de Reanimated usados en la app
const useAnimatedRef = () => React.createRef();
const useAnimatedScrollHandler = () => () => {};
const useDerivedValue = (fn) => ({ value: fn() });
const useAnimatedReaction = () => {};
const cancelAnimation = () => {};
const measure = () => null;
const scrollTo = () => {};
const useScrollViewOffset = () => ({ value: 0 });

// useEvent — used internally by react-native-gesture-handler's GestureDetector
// Returns a no-op worklet event handler
const useEvent = (_handler, _eventNames, _rebuild) => {
  return () => {};
};

// useHandler — used internally by Reanimated context handlers
const useHandler = (handlers, _deps) => {
  return { context: {}, doDependenciesDiffer: false, useWeb: false };
};

const Easing = {
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
  linear: (t) => t,
  ease: (t) => t,
  bezier: () => (t) => t,
};

// Animated default export — objeto con los componentes animados
const Animated = {
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView,
  FlatList: AnimatedFlatList,
  createAnimatedComponent: (Component) => Component,
};

// Layout animations (FadeIn, FadeOut, etc.) — stubs for Jest
// Each returns a fluent builder that produces a no-op layout animation config.
function createLayoutAnimationMock() {
  const self = {
    duration: () => self,
    delay: () => self,
    springify: () => self,
    damping: () => self,
    stiffness: () => self,
    easing: () => self,
    build: () => null,
  };
  return self;
}

const FadeIn = createLayoutAnimationMock();
const FadeOut = createLayoutAnimationMock();
const SlideInDown = createLayoutAnimationMock();
const SlideOutDown = createLayoutAnimationMock();
const ZoomIn = createLayoutAnimationMock();
const ZoomOut = createLayoutAnimationMock();
const BounceIn = createLayoutAnimationMock();
const Layout = createLayoutAnimationMock();

module.exports = {
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  interpolate,
  interpolateColor,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedReaction,
  cancelAnimation,
  measure,
  scrollTo,
  useScrollViewOffset,
  useEvent,
  useHandler,
  Easing,
  // Layout animations
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  BounceIn,
  Layout,
  // Constantes de extrapolación
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
};

