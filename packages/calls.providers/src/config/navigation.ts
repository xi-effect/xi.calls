export type CallsNavigationSearchT = Record<string, string | undefined>;

export type CallsNavigationParamsT = {
  callId?: string;
  classroomId?: string;
  boardId?: string;
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
