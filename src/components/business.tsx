import React from 'react';
import { Pressable, View } from 'react-native';
import { AREAS, BZCOLORS, SIZES } from '../data/catalog';
import { MyBiz } from '../data/db';
import { Avatar, Chip, Chips, Field, Input, Label, SelectBox, Txt, tap } from '../ui/kit';
import { C, R } from '../ui/theme';
import { pick, toast } from '../ui/overlay';
import { bizLogo, isEmail, isPhone } from '../logic/core';
import { pickImage } from '../logic/media';
import { PhoneInput } from './auth';

/* The fields of a business page, written once and used in both places a business is filled in:
   the sign-up steps (app/bizob.tsx) and the page's own set-up and edit sheet (sheets/account.tsx).
   `set` receives the changed fields; `id` prefixes the test ids ("bo" at sign-up, "bz" in the sheet). */
type Set = (p: Partial<MyBiz>) => void;

/** Name, sector, team size and what the business does. `miss`: which required field to mark. */
export function BizAbout({ b, set, miss, id }: { b: MyBiz; set: Set; miss?: 'name' | 'sector' | null; id: string }) {
  return (
    <>
      <Field label="Business name" error={miss === 'name' && 'Add your business name'}>
        <Input testID={`${id}-name`} value={b.name} onChangeText={(v) => set({ name: v })} icon="storefront" placeholder="e.g. Ekole Services Ltd" maxLength={50} invalid={miss === 'name'} autoCapitalize="words" />
      </Field>
      <Field label="Sector" error={miss === 'sector' && 'Choose a sector'}>
        <SelectBox testID={`${id}-sector`} value={b.sector} placeholder="Choose a sector" invalid={miss === 'sector'} onPress={() => pick('Sector', AREAS.map((a) => a[0]), b.sector, (v) => set({ sector: v }), true)} />
      </Field>
      <View>
        <Label>Team size</Label>
        <Chips>
          {SIZES.map((z) => (
            <Chip key={z} label={z} on={b.size === z} onPress={() => set({ size: z })} />
          ))}
        </Chips>
      </View>
      <Field label="What does your business do?">
        <Input multiline maxHeight={220} value={b.about} onChangeText={(v) => set({ about: v })} maxLength={600} placeholder="A few sentences candidates will read on your page" />
      </Field>
    </>
  );
}

/** City, neighbourhood, address, phone, email (in the edit sheet) and website. `onCity` opens the city sheet. */
export function BizWhere({ b, set, onCity, miss, email, id }: { b: MyBiz; set: Set; onCity: () => void; miss?: 'city' | null; email?: boolean; id: string }) {
  const phoneBad = !!b.phone && !isPhone(b.phone);
  const mailBad = !!b.email && !isEmail(b.email);
  return (
    <>
      <Field label="City" error={miss === 'city' && 'Choose the city your business is in'}>
        <SelectBox testID={`${id}-city`} value={b.city} placeholder="Choose a city" icon="pin" invalid={miss === 'city'} onPress={onCity} />
      </Field>
      <Field label="Neighbourhood">
        <Input value={b.area} onChangeText={(v) => set({ area: v })} placeholder="Neighbourhood or district" />
      </Field>
      <Field label="Street address">
        <Input value={b.address} onChangeText={(v) => set({ address: v })} icon="pin" placeholder="Street, building or landmark" />
      </Field>
      <Field label="Business phone" error={phoneBad && 'Enter a valid phone number'}>
        <PhoneInput value={b.phone || ''} onChange={(v) => set({ phone: v })} invalid={phoneBad} />
      </Field>
      {email ? (
        <Field label="Email" error={mailBad && 'That email doesn’t look right'}>
          <Input keyboardType="email-address" autoCapitalize="none" value={b.email} onChangeText={(v) => set({ email: v.trim() })} placeholder="jobs@yourbusiness.cm" invalid={mailBad} />
        </Field>
      ) : null}
      <Field label="Website · optional">
        <Input value={b.web} onChangeText={(v) => set({ web: v.trim() })} icon="globe" placeholder="yourbusiness.cm" autoCapitalize="none" />
      </Field>
    </>
  );
}

/** The two registration numbers bolo checks. `locked`: already sent or verified, so they can't be changed. */
export function BizDocs({ b, set, locked }: { b: MyBiz; set: Set; locked?: boolean }) {
  return (
    <>
      <Field label="Trade register number (RCCM)">
        <Input value={b.rccm} onChangeText={(v) => set({ rccm: v })} icon="file" placeholder="e.g. RC/BUE/2024/B/123" autoCapitalize="characters" editable={!locked} />
      </Field>
      <Field label="Taxpayer number (NIU)">
        <Input value={b.niu} onChangeText={(v) => set({ niu: v })} icon="idcard" placeholder="e.g. M012345678901A" autoCapitalize="characters" editable={!locked} />
      </Field>
    </>
  );
}

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
