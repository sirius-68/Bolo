import React from 'react';
import { Pressable, View } from 'react-native';
import { BZCOLORS } from '../data/catalog';
import { Avatar, Txt, tap } from '../ui/kit';
import { C, R } from '../ui/theme';
import { toast } from '../ui/overlay';
import { bizLogo } from '../logic/core';
import { pickImage } from '../logic/media';

/** Colour swatches + upload for a business logo. */
export function LogoPicker({ b, onChange }: { b: { name: string; logo: string | null; color: string }; onChange: (p: any) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 18, padding: 14, borderRadius: R.lg, backgroundColor: C.s1 }}>
      <Avatar pic={bizLogo({ ...(b as any), name: b.name || 'B' })} size={72} square />
      <View style={{ flex: 1, gap: 8 }}>
        <Txt s={12} w={6} c={C.muted}>
          Logo colour
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {BZCOLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityLabel={`Colour ${c}`}
              onPress={() => {
                tap();
                onChange({ logo: null, color: c });
              }}
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: !b.logo && b.color === c ? 3 : 1, borderColor: !b.logo && b.color === c ? C.white : C.s3 }}
            />
          ))}
        </View>
        <Pressable
          onPress={async () => {
            const p = await pickImage({ square: true });
            if (p) {
              onChange({ logo: p });
              toast('Logo added');
            }
          }}
        >
          <Txt s={13} w={7} c={C.lav}>
            {b.logo ? 'Change logo' : 'Upload your logo'}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}
