/* eslint-disable @typescript-eslint/no-explicit-any */
import { StartCallDataT } from '@xipkg/calls-types';

export type AuthPortT = {
  useCurrentUser(disabled?: boolean): {
    data?: any;
    isLoading: boolean;
    isError: boolean;
  };
};

export type ClassroomPortT = {
  useGetClassroom(
    id: number,
    disabled?: boolean,
  ): {
    data?: any;
    isLoading: boolean;
    isError: boolean;
  };
  useAddClassroomMaterials: () => { addClassroomMaterials: any };
  useGetClassroomMaterialsList(params: {
    classroomId: string;
    content_type: string;
    disabled?: boolean;
  }): {
    data?: any[];
    isLoading: boolean;
    isError: boolean;
  };
};

export type CallAuthPortT = {
  createTokenByTutor(data: StartCallDataT): Promise<string>;
  createTokenByStudent(data: StartCallDataT): Promise<string>;
  reactivateCall(data: StartCallDataT): Promise<void>;

  isLoading: boolean;
  error?: any;
};

export type UpdateParticipantMetadataPortT = {
  updateParticipantMetadata: (data: {
    classroom_id: string;
    is_hand_raised: boolean;
    role?: string;
  }) => Promise<void>;

  isPending: boolean;
  error?: unknown;
};

/** Синхронизация режима ВКС/доски через метаданные комнаты (LiveKit + бэкенд) */
export type ConferenceMetadataPortT = {
  updateConferenceMetadata(data: {
    classroom_id: string;
    active_material_id: number;
  }): Promise<void>;
};

export type CallsAppConfigPortT = {
  getClassroomJoinLink(classroomId: string | number): string;
};
