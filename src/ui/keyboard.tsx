/* Keeps content above the keyboard.
   The stock KeyboardAvoidingView leaves a gap on Android phones that draw under the system bars
   (edge to edge): when the keyboard closes it still pads by the height of the navigation bar, so
   a chat's message box stays lifted. Here the space is exactly what the keyboard covers while it
   is open, and exactly nothing once it is closed. */
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, LayoutChangeEvent, Platform, View, ViewProps } from 'react-native';

/** True while the keyboard is open. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(() => {
    try {
      return Keyboard.isVisible();
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return open;
}

function AndroidAvoid({ style, children, onLayout, ...rest }: ViewProps) {
  const [pad, setPad] = useState(0);
  const frame = useRef<{ y: number; height: number } | null>(null);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const f = frame.current;
      const bottom = f ? f.y + f.height : Dimensions.get('window').height;
      const top = e?.endCoordinates?.screenY;
      setPad(typeof top === 'number' ? Math.max(0, Math.round(bottom - top)) : 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View
      {...rest}
      style={[style, { paddingBottom: pad }]}
      onLayout={(e: LayoutChangeEvent) => {
        frame.current = e.nativeEvent.layout;
        onLayout?.(e);
      }}
    >
      {children}
    </View>
  );
}

export function KeyAvoid(props: ViewProps) {
  if (Platform.OS === 'android') return <AndroidAvoid {...props} />;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} {...props} />;
}
