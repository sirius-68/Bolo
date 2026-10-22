import React, { useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OB } from '../src/data/catalog';
import { Pict, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';

export default function Onboard() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const list = useRef<FlatList>(null);
  const next = () => {
    tap();
    if (i < OB.length - 1) list.current?.scrollToIndex({ index: i + 1, animated: true });
    else router.replace('/welcome');
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 12, paddingBottom: ins.bottom + 24 }}>
      <View style={{ height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Pressable hitSlop={10} onPress={() => router.replace('/welcome')} testID="skip">
          <Txt s={13} w={7} c={C.muted}>
            Skip
          </Txt>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={OB}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(o) => o.t}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 20 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              <Pict pic={`art/${item.art}`} style={{ width: '100%', maxWidth: 360, aspectRatio: 340 / 300 }} fit="contain" />
            </View>
            <Txt s={26} w={8} style={{ lineHeight: 30 }}>
              {item.t}
            </Txt>
            <Txt s={14} c={C.muted} style={{ marginTop: 8, maxWidth: 320 }}>
              {item.p}
            </Txt>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {OB.map((_, j) => (
            <View key={j} style={{ width: j === i ? 28 : 8, height: 4, borderRadius: 4, backgroundColor: j === i ? '#fff' : C.s3 }} />
          ))}
        </View>
        <Pressable
          testID="ob-next"
          accessibilityLabel={i < OB.length - 1 ? 'Next' : 'Get started'}
          onPress={next}
          style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
          <Icon name="arrow" size={24} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}
