export type CallsNavigationSearchT = Record<string, string | undefined>;

export type SharedMaterialKindT = 'board' | 'note';

export type CallsNavigationParamsT = {
  callId?: string;
  classroomId?: string;
  boardId?: string;
  noteId?: string;
};

export type CallsNavigationT = {
  pathname: string;
  search: CallsNavigationSearchT;
  params: CallsNavigationParamsT;
  /** callId из маршрута или query `call` */
  getCallId(): string | undefined;
  navigateToCall(classroomId: string, options?: { replace?: boolean }): void;
  navigateToClassroom(classroomId: string): void;
  navigateToClassroomOverview(classroomId: string, options?: { backgroundCall?: boolean }): void;
  navigateToClassroomBoard(
    classroomId: string,
    boardId: string,
    options?: { replace?: boolean },
  ): void;
  navigateToClassroomNote(
    classroomId: string,
    noteId: string,
    options?: { replace?: boolean },
  ): void;
  navigateToBoard(
    boardId: string,
    options?: { search?: CallsNavigationSearchT; replace?: boolean },
  ): void;
  /** Остаться на текущем pathname, обновить только search */
  replaceSearch(search: CallsNavigationSearchT): void;
  /** Удалить query-параметр `call` на текущей странице */
  clearCallSearchParam(): void;
  pathnameIncludes(segment: string): boolean;
  /** /classrooms/:id с tab=overview (или без tab) и ?call= */
  isOnClassroomOverviewWithActiveCall(): boolean;
  /** Не /call/, но в URL есть ?call= */
  isOnOtherPageWithCompactCall(): boolean;
};

/** Реализацию поставляет хост-приложение (xi.tutor) */
export type UseCallsNavigationHookT = () => CallsNavigationT;

export const isSharedMaterialPath = (pathname: string) =>
  pathname.includes('/board') || pathname.includes('/notes');

export const isOnSharedMaterial = (
  navigation: Pick<CallsNavigationT, 'params'>,
  materialId: string | undefined,
  classroomId: string | undefined,
  kind: SharedMaterialKindT | undefined,
) => {
  if (!materialId || navigation.params.classroomId !== classroomId) return false;
  if (kind === 'note') return navigation.params.noteId === materialId;
  return navigation.params.boardId === materialId;
};

export const navigateToSharedMaterial = (
  navigation: Pick<
    CallsNavigationT,
    'navigateToClassroomBoard' | 'navigateToClassroomNote' | 'navigateToBoard'
  >,
  materialId: string,
  classroomId: string | undefined,
  kind: SharedMaterialKindT | undefined,
  options?: { replace?: boolean; search?: CallsNavigationSearchT },
) => {
  if (kind === 'note') {
    if (!classroomId) return;
    navigation.navigateToClassroomNote(classroomId, materialId, options);
    return;
  }

  if (classroomId) {
    navigation.navigateToClassroomBoard(classroomId, materialId, options);
    return;
  }

  navigation.navigateToBoard(materialId, options);
};
