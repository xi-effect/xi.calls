/* eslint-disable @typescript-eslint/no-explicit-any */
import { StartCallDataT } from '../types';

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
  useAddClassroomMaterials: () => void;
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
