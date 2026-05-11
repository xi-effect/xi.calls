/* eslint-disable @typescript-eslint/no-explicit-any */
import { LiveKitRoomProps } from '@livekit/components-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RaisedHandT = {
  participantId: string;
  participantName: string;
  timestamp: number;
};

export type CornerT = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type useCallStoreT = {
  // разрешение от браузера на использование камеры
  isCameraPermission: boolean | null;
  isMicroPermission: boolean | null;
  // включён ли у пользователя микро
  audioEnabled: boolean;
  videoEnabled: boolean;
  // id-выбранного устройства
  audioDeviceId: ConstrainDOMString | undefined;
  audioOutputDeviceId: ConstrainDOMString | undefined;
  videoDeviceId: ConstrainDOMString | undefined;
  // подключена ли конференция
  connect: LiveKitRoomProps['connect'];
  // началась ли ВКС для пользователя
  isStarted: boolean | undefined;
  // состояние подключения
  isConnecting: boolean;

  mode: 'compact' | 'full';
  carouselType: 'grid' | 'horizontal' | 'vertical';
  preferredFocusLayout: 'horizontal' | 'vertical';
  activeCorner: CornerT;

  /** Режим вида компакт-ВКС на десктопе: одна плитка или развёрнутый список (учёт при DnD) */
  compactViewMode: 'basic' | 'expanded';

  // Текущая активная доска (для синхронизации с новыми участниками)
  activeBoardId: string | undefined;
  activeClassroom: string | undefined;

  /** Локальный переключатель: пользователь сам ушёл в полную ВКС («Только меня»), комната на сервере остаётся на доске */
  localFullView: boolean;

  // токен для конференции
  token: string | undefined;

  // Поднятые руки
  raisedHands: RaisedHandT[];
  isHandRaised: boolean;

  updateStore: (type: keyof useCallStoreT, value: any) => void;
  addRaisedHand: (hand: RaisedHandT) => void;
  removeRaisedHand: (participantId: string) => void;
  toggleHandRaised: () => void;
  clearAllRaisedHands: () => void;
  isHandRaisedByParticipant: (participantId: string) => boolean;
};

export const useCallStore = create<useCallStoreT>()(
  persist(
    (set, get) => ({
      isCameraPermission: null,
      isMicroPermission: null,
      audioEnabled: false,
      videoEnabled: false,
      audioDeviceId: undefined,
      audioOutputDeviceId: undefined,
      videoDeviceId: undefined,
      connect: undefined,
      isStarted: undefined,
      isConnecting: false,
      mode: 'full',
      carouselType: 'grid',
      preferredFocusLayout: 'horizontal',
      activeCorner: 'top-left',
      compactViewMode: 'basic',

      // Текущая активная доска
      activeBoardId: undefined,
      activeClassroom: undefined,

      localFullView: false,

      // токен для конференции
      token: undefined,

      // Поднятые руки
      raisedHands: [],
      isHandRaised: false,

      updateStore: (type: keyof useCallStoreT, value: any) => set({ [type]: value }),

      // Поднятые руки
      addRaisedHand: (hand: RaisedHandT) =>
        set((state) => {
          // Проверяем, есть ли уже рука от этого участника
          const existingHand = state.raisedHands.find(
            (h) => h.participantId === hand.participantId,
          );
          if (existingHand) {
            // Обновляем существующую руку
            return {
              raisedHands: state.raisedHands.map((h) =>
                h.participantId === hand.participantId ? hand : h,
              ),
            };
          }
          // Добавляем новую руку
          return { raisedHands: [...state.raisedHands, hand] };
        }),
      removeRaisedHand: (participantId: string) =>
        set((state) => ({
          raisedHands: state.raisedHands.filter((hand) => hand.participantId !== participantId),
        })),
      toggleHandRaised: () => set((state) => ({ isHandRaised: !state.isHandRaised })),
      clearAllRaisedHands: () => set({ raisedHands: [], isHandRaised: false }),
      isHandRaisedByParticipant: (participantId: string) => {
        const state = get();
        return state.raisedHands.some((hand) => hand.participantId === participantId);
      },
    }),
    {
      name: 'call-store',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const ct = state.carouselType;
          if (ct === 'focus') {
            state.carouselType = 'horizontal';
          }
        }
        if (version < 3) {
          const ct = state.carouselType;
          state.preferredFocusLayout = ct === 'horizontal' || ct === 'vertical' ? ct : 'horizontal';
        }
        return state as useCallStoreT;
      },
      partialize: (state) => ({
        isCameraPermission: state.isCameraPermission,
        isMicroPermission: state.isMicroPermission,
        audioEnabled: state.audioEnabled,
        videoEnabled: state.videoEnabled,
        audioDeviceId: state.audioDeviceId,
        videoDeviceId: state.videoDeviceId,
        carouselType: state.carouselType,
        preferredFocusLayout: state.preferredFocusLayout,
        activeCorner: state.activeCorner,
      }),
    },
  ),
);
