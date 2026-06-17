/* eslint-disable @typescript-eslint/no-explicit-any */
import { LiveKitRoomProps } from '@livekit/components-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PinnedParticipantT } from './pinnedTrack';

type RaisedHandT = {
  participantId: string;
  participantName: string;
  timestamp: number;
};

export type CornerT = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type CompactViewModeT = 'basic' | 'expanded' | 'audio';

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

  /** Режим вида компакт-ВКС: одна плитка, несколько плиток или только аудио */
  compactViewMode: CompactViewModeT;

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

  /** Закреплённые участники по кабинетам (userId + source), порядок = приоритет */
  pinnedByClassroom: Record<string, PinnedParticipantT[]>;

  updateStore: (type: keyof useCallStoreT, value: any) => void;
  togglePinnedParticipant: (pin: PinnedParticipantT, classroomId: string) => void;
  removePinnedParticipant: (pin: PinnedParticipantT, classroomId: string) => void;
  getPinsForClassroom: (classroomId: string) => PinnedParticipantT[];
  isParticipantPinned: (pin: PinnedParticipantT, classroomId: string) => boolean;
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

      pinnedByClassroom: {},

      updateStore: (type: keyof useCallStoreT, value: any) => set({ [type]: value }),

      togglePinnedParticipant: (pin: PinnedParticipantT, classroomId: string) =>
        set((state) => {
          const current = state.pinnedByClassroom[classroomId] ?? [];
          const existingIndex = current.findIndex(
            (item) => item.userId === pin.userId && item.source === pin.source,
          );
          const next = { ...state.pinnedByClassroom };

          if (existingIndex >= 0) {
            const updated = current.filter((_, index) => index !== existingIndex);
            if (updated.length) {
              next[classroomId] = updated;
            } else {
              delete next[classroomId];
            }
          } else {
            next[classroomId] = [...current, pin];
          }

          return { pinnedByClassroom: next };
        }),
      removePinnedParticipant: (pin: PinnedParticipantT, classroomId: string) =>
        set((state) => {
          const current = state.pinnedByClassroom[classroomId];
          if (!current?.length) return state;

          const updated = current.filter(
            (item) => !(item.userId === pin.userId && item.source === pin.source),
          );
          const next = { ...state.pinnedByClassroom };
          if (updated.length) {
            next[classroomId] = updated;
          } else {
            delete next[classroomId];
          }
          return { pinnedByClassroom: next };
        }),
      getPinsForClassroom: (classroomId: string) => get().pinnedByClassroom[classroomId] ?? [],
      isParticipantPinned: (pin: PinnedParticipantT, classroomId: string) => {
        const pins = get().pinnedByClassroom[classroomId] ?? [];
        return pins.some((item) => item.userId === pin.userId && item.source === pin.source);
      },

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
      version: 5,
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
        if (version < 4) {
          const mode = state.compactViewMode;
          state.compactViewMode =
            mode === 'basic' || mode === 'expanded' || mode === 'audio' ? mode : 'basic';
        }
        if (version < 5) {
          state.pinnedByClassroom =
            typeof state.pinnedByClassroom === 'object' && state.pinnedByClassroom !== null
              ? state.pinnedByClassroom
              : {};
          delete state.pinnedTrack;
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
        compactViewMode: state.compactViewMode,
        pinnedByClassroom: state.pinnedByClassroom,
      }),
    },
  ),
);
