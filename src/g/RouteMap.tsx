/* The small live map on a job: where the worker is now, where the job is, and the way between. */
import React from 'react';
import { View } from 'react-native';
import { Mapbox } from '../lib/mapbox';
import { GIcon } from './icons';
import { RED, useG } from './theme';
import { Face } from './ui';

type LngLat = [number, number];

export function RouteMap({ from, to, height, live, name, photo }: { from: LngLat; to: LngLat; height: number; live?: LngLat | null; name: string; photo?: string | null }) {
  const t = useG();
  if (!Mapbox) return null;
  const M = Mapbox;
  const cur: LngLat = live || from;
  const line = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [cur, to] } };
  const mid: LngLat = [(cur[0] + to[0]) / 2, (cur[1] + to[1]) / 2];
  const far = Math.abs(cur[0] - to[0]) > 0.002 || Math.abs(cur[1] - to[1]) > 0.002;
  const bounds = far ? { ne: [Math.max(cur[0], to[0]), Math.max(cur[1], to[1])], sw: [Math.min(cur[0], to[0]), Math.min(cur[1], to[1])], paddingTop: 60, paddingBottom: 40, paddingLeft: 50, paddingRight: 50 } : undefined;
  return (
    <View style={{ height }}>
      <M.MapView style={{ flex: 1 }} styleURL={t.dark ? M.StyleURL.Dark : M.StyleURL.Light} scaleBarEnabled={false} compassEnabled={false} pitchEnabled={false} rotateEnabled={false} logoPosition={{ bottom: 6, left: 8 }} attributionPosition={{ bottom: 6, right: 8 }}>
        <M.Camera defaultSettings={{ centerCoordinate: mid, zoomLevel: 13.6 }} bounds={bounds} centerCoordinate={bounds ? undefined : mid} zoomLevel={bounds ? undefined : 15} animationDuration={800} />
        <M.ShapeSource id="route" shape={line}>
          <M.LineLayer id="routeLine" style={{ lineColor: RED, lineWidth: 5, lineCap: 'round' }} />
        </M.ShapeSource>
        <M.MarkerView coordinate={to} allowOverlap>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.text, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="pin" size={18} color={t.bg} />
          </View>
        </M.MarkerView>
        <M.MarkerView coordinate={cur} allowOverlap>
          <View style={{ borderRadius: 24, borderWidth: 3, borderColor: '#ffffff' }}>
            <Face name={name} photo={photo} size={40} />
          </View>
        </M.MarkerView>
      </M.MapView>
    </View>
  );
}
