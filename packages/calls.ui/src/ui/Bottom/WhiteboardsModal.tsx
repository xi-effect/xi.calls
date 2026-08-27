import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalCloseButton,
} from '@xipkg/modal';
import { Input } from '@xipkg/input';
import { Button } from '@xipkg/button';
import { ScrollArea } from '@xipkg/scrollarea';
import { Badge } from '@xipkg/badge';
import { Checkbox } from '@xipkg/checkbox';
import { useEffect, useState } from 'react';
import { Close, Search } from '@xipkg/icons';
import { useCallStore } from '@xipkg/calls-store';
import { useSyncModeToOthers } from '@xipkg/calls-hooks';
import { useCalls, useCallsNavigation } from '@xipkg/calls-providers';
import { useMedia } from '@xipkg/calls-utils';
import { Trans, useTranslation } from 'react-i18next';

// Типы материалов определены в @xipkg/calls-types -> ClassroomMaterialsT

type WhiteboardsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const toBoardId = (id: unknown): string | null => {
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.trim().length > 0) return id.trim();
  return null;
};

export const WhiteboardsModal = ({ open, onOpenChange }: WhiteboardsModalProps) => {
  const { t } = useTranslation('calls');
  const isMobile = useMedia('(max-width: 720px)');
  const navigation = useCallsNavigation();
  const callId = navigation.getCallId();
  const activeClassroom = useCallStore((state) => state.activeClassroom);
  const updateStore = useCallStore((state) => state.updateStore);
  const syncModeToOthers = useSyncModeToOthers();
  const { auth, room } = useCalls();

  const classroomId = callId ?? activeClassroom;
  const { data: user } = auth.useCurrentUser();
  const isTutor = user?.default_layout === 'tutor';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(true);

  useEffect(() => {
    if (open) return;
    setSearchQuery('');
    setSelectedBoardId(null);
    setIsCollaborativeMode(true);
  }, [open]);

  // Хук для создания новой доски
  const { addClassroomMaterials } = room.useAddClassroomMaterials();

  const {
    data: boards,
    isLoading,
    isError,
  } = room.useGetClassroomMaterialsList({
    classroomId: classroomId || '',
    content_type: 'board',
    disabled: !classroomId || !isTutor,
  });

  const filteredWhiteboards = (boards || [])
    // только доски с доступом совместная работа (read_write)
    .filter((b) => b.content_kind === 'board' && b.student_access_mode === 'read_write')
    // фильтр по поисковой строке
    .filter((b) =>
      searchQuery.trim() ? b.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true,
    );

  const handleBoardSelect = (boardId: unknown) => {
    setSelectedBoardId(toBoardId(boardId));
  };

  const handleCreateNewBoard = async () => {
    if (!classroomId) return;

    try {
      const result = await addClassroomMaterials({
        classroomId,
        content_kind: 'board',
        student_access_mode: 'read_write', // Режим совместного редактирования
      });

      const newBoardId = toBoardId(result?.data?.id);
      if (!newBoardId) return;

      setSelectedBoardId(newBoardId);

      if (isCollaborativeMode) {
        syncModeToOthers('compact', newBoardId, classroomId);
      }
    } catch (error) {
      console.error('❌ Error creating new board:', error);
    }
  };

  const handleConfirm = () => {
    if (!selectedBoardId) return;

    // Сначала цель перехода и навигация, потом compact: иначе zustand синхронно
    // перестраивает дерево (Call → CompactView) и повторный переход на ту же доску
    // может не успеть уйти в роутер. localFullView сбрасываем — иначе после
    // «Вернуть только меня» applyRoomMetadata игнорирует переход на доску.
    updateStore('localFullView', false);
    updateStore('activeBoardId', selectedBoardId);
    updateStore('activeClassroom', classroomId);

    if (isCollaborativeMode) {
      syncModeToOthers('compact', selectedBoardId, classroomId);
    }

    if (classroomId) {
      navigation.navigateToClassroomBoard(classroomId, selectedBoardId);
    } else {
      navigation.navigateToBoard(selectedBoardId);
    }

    updateStore('mode', 'compact');
    onOpenChange(false);
  };

  const accessLabel = (mode: string) => {
    if (mode === 'read_write') return t('whiteboards.access.readWrite');
    if (mode === 'read_only') return t('whiteboards.access.readOnly');
    return t('whiteboards.access.draft');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        className={
          isMobile
            ? 'text-text-primary flex max-h-[90dvh] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] flex-col rounded-2xl'
            : 'text-text-primary w-[680px]'
        }
        aria-describedby={undefined}
      >
        <ModalCloseButton>
          <Close className="fill-icon-primary" />
        </ModalCloseButton>
        <ModalHeader className="border-border-default shrink-0 border-b">
          <ModalTitle className="text-m-base sm:text-l-base text-text-primary">
            {t('whiteboards.title')}
          </ModalTitle>
          <Input
            before={<Search className="fill-icon-secondary" />}
            placeholder={t('whiteboards.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="placeholder:text-text-secondary text-text-primary min-h-10"
          />
        </ModalHeader>

        <div
          className={isMobile ? 'min-h-0 flex-1 overflow-hidden px-4 py-4 pr-2' : 'py-4 pr-2 pl-6'}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-text-secondary">{t('whiteboards.loading')}</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-text-danger">{t('whiteboards.loadError')}</p>
            </div>
          ) : (
            <ScrollArea className={`h-full w-full ${isMobile ? 'max-h-[50dvh]' : 'max-h-[400px]'}`}>
              <div className="space-y-4 pr-4">
                {filteredWhiteboards.map((board) => (
                  <div
                    key={board.id}
                    className={`hover:bg-background-page border-border-default flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 ${
                      selectedBoardId === String(board.id)
                        ? 'border-border-focus bg-status-info-background'
                        : ''
                    }`}
                    onClick={() => handleBoardSelect(board.id)}
                  >
                    {board.student_access_mode && (
                      <Badge
                        variant="default"
                        className={
                          board.student_access_mode === 'read_write'
                            ? 'text-s-base bg-background-subtle text-text-primary px-2 py-1 font-medium'
                            : board.student_access_mode === 'read_only'
                              ? 'text-s-base bg-tag-cyan-background text-tag-cyan-accent px-2 py-1 font-medium'
                              : 'text-s-base bg-tag-violet-background text-tag-violet-accent px-2 py-1 font-medium'
                        }
                      >
                        {accessLabel(board.student_access_mode)}
                      </Badge>
                    )}
                    <h3 className="text-m-base text-text-primary">{board.name}</h3>
                    <p className="text-xs-base text-text-secondary">
                      {t('whiteboards.updatedAt', {
                        date: new Date(board.updated_at).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                ))}
                <div
                  className="bg-status-info-background group flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-4"
                  onClick={handleCreateNewBoard}
                >
                  <h3 className="text-s-base text-text-link group-hover:text-text-link">
                    {addClassroomMaterials.isPending
                      ? t('whiteboards.creating')
                      : t('whiteboards.createNew')}
                  </h3>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <ModalFooter className="border-border-default flex shrink-0 flex-col gap-4 border-t">
          <div className="flex items-start gap-2">
            <Checkbox
              id="collaborative-mode"
              checked={isCollaborativeMode}
              onCheckedChange={(checked) => setIsCollaborativeMode(checked === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="collaborative-mode"
              className="text-s-base text-text-primary cursor-pointer"
            >
              {isMobile ? (
                t('whiteboards.collaborativeLabel')
              ) : (
                <Trans
                  i18nKey="whiteboards.collaborativeLabelDesktop"
                  ns="calls"
                  components={{ br: <br /> }}
                />
              )}
            </label>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
            <Button
              size="m"
              onClick={handleConfirm}
              disabled={!selectedBoardId}
              className={isMobile ? 'min-h-11 w-full' : ''}
            >
              {t('whiteboards.select')}
            </Button>
            <Button
              size="m"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={isMobile ? 'min-h-11 w-full' : ''}
            >
              {t('whiteboards.cancel')}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
