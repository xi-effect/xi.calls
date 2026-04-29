import { create } from 'zustand';

export type FeatureKey = 'compactView' | 'whiteboard' | 'raiseHand' | 'chat';

type FeatureMapT = Record<FeatureKey, boolean>;

type FeaturesState = {
  features: FeatureMapT;

  setFeature: (key: FeatureKey, value: boolean) => void;
  setFeatures: (features: Partial<FeatureMapT>) => void;
};

const defaultFeatures: FeatureMapT = {
  compactView: true,
  whiteboard: true,
  raiseHand: true,
  chat: true,
};

export const useFeaturesStore = create<FeaturesState>((set) => ({
  features: defaultFeatures,

  setFeature: (key, value) =>
    set((state) => ({
      features: { ...state.features, [key]: value },
    })),

  setFeatures: (features) =>
    set((state) => ({
      features: { ...state.features, ...features },
    })),
}));
