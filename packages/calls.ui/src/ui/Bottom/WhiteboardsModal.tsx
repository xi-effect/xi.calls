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
import { SwitcherAnimate } from '@xipkg/switcher-animate';
import { useEffect, useMemo, useState } from 'react';
import { Search } from '@xipkg/icons';
import { useCallStore } from '@xipkg/calls-store';
import { useSyncModeToOthers } from '@xipkg/calls-hooks';
import {
  navigateToSharedMaterial,
  useCalls,
  useCallsNavigation,
  type SharedMaterialKindT,
} from '@xipkg/calls-providers';
import { useMedia } from '@xipkg/calls-utils';
import { Trans, useTranslation } from 'react-i18next';
import { readTutorCallSession } from '../Onboarding/tutorCallSession';

type WhiteboardsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const toMaterialId = (id: unknown): string | null => {
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
  const [kind, setKind] = useState<SharedMaterialKindT>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(true);
  const isNote = kind === 'note';
  const materialTabs = useMemo(
    () => [
      { id: 'board', label: t('whiteboards.kindBoard') },
      { id: 'note', label: t('whiteboards.kindNote') },
    ],
    [t],
  );
  const contentHeightClass = isMobile ? 'h-[min(50dvh,400px)]' : 'h-[400px]';

  useEffect(() => {
    if (open) return;
    setKind('board');
    setSearchQuery('');
    setSelectedMaterialId(null);
    setIsCollaborativeMode(true);
  }, [open]);

  const { addClassroomMaterials } = room.useAddClassroomMaterials();

  const {
    data: materials,
    isLoading,
    isError,
  } = room.useGetClassroomMaterialsList({
    classroomId: classroomId || '',
    content_type: kind,
    content_kind: kind,
    disabled: !classroomId || !isTutor,
  });

  const guideBoardId = readTutorCallSession()?.boardId ?? null;
  const filteredMaterials = (materials || [])
    .filter((item) => item.content_kind === kind && item.student_access_mode === 'read_write')
    .filter((item) =>
      searchQuery.trim()
        ? String(item.name ?? '')
            .toLowerCase()
            .includes(searchQuery.trim().toLowerCase())
        : true,
    );

  const openMaterial = (materialId: string) => {
    updateStore('localFullView', false);
    updateStore('activeBoardId', materialId);
    updateStore('activeMaterialKind', kind);
    updateStore('activeClassroom', classroomId);

    if (isCollaborativeMode) {
      syncModeToOthers('compact', materialId, classroomId, kind);
    }

    navigateToSharedMaterial(navigation, materialId, classroomId, kind);
    updateStore('mode', 'compact');
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!classroomId) return;

    try {
      const result = await addClassroomMaterials({
        classroomId,
        content_kind: kind,
        student_access_mode: 'read_write',
      });

      const materialId = toMaterialId(result?.data?.id);
      if (!materialId) return;

      setSelectedMaterialId(materialId);
      if (isCollaborativeMode) {
        syncModeToOthers('compact', materialId, classroomId, kind);
      }
    } catch (error) {
      console.error('❌ Error creating material:', error);
    }
  };

  const handleConfirm = () => {
    if (!selectedMaterialId) return;
    openMaterial(selectedMaterialId);
  };

  const accessLabel = (mode: string) => {
    if (mode === 'read_write') return t('whiteboards.access.readWrite');
    if (mode === 'read_only') return t('whiteboards.access.readOnly');
    return t('whiteboards.access.draft');
  };

  const demoIndex = Math.max(
    0,
    filteredMaterials.findIndex((item) => String(item.id) === guideBoardId),
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        id="tutor-call-boards"
        className={
          isMobile
            ? 'text-text-primary flex max-h-[90dvh] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] flex-col rounded-2xl'
            : 'text-text-primary w-[680px]'
        }
        aria-describedby={undefined}
      >
        <ModalCloseButton />
        <ModalHeader className="border-border-default shrink-0 border-b">
          <ModalTitle className="text-m-base sm:text-l-base text-text-primary max-w-[calc(100%-48px)] sm:max-w-full">
            {t('whiteboards.title')}
          </ModalTitle>
          <SwitcherAnimate
            tabs={materialTabs}
            activeTab={kind}
            onChange={(next) => {
              if (next !== 'board' && next !== 'note') return;
              setKind(next);
              setSelectedMaterialId(null);
              setSearchQuery('');
            }}
            className="bg-background-subtle! w-full"
          />
          <Input
            before={<Search className="fill-icon-secondary" />}
            placeholder={t('whiteboards.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="placeholder:text-text-secondary text-text-primary min-h-10"
          />
        </ModalHeader>

        <div
          className={`${contentHeightClass} shrink-0 overflow-hidden ${isMobile ? 'px-4 py-4 pr-2' : 'py-4 pr-2 pl-6'}`}
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-text-secondary">{t('whiteboards.loading')}</p>
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-text-danger">{t('whiteboards.loadError')}</p>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="space-y-4 pr-4">
                {filteredMaterials.map((material, index) => (
                  <div
                    key={material.id}
                    id={
                      kind === 'board' && index === demoIndex ? 'tutor-call-demo-board' : undefined
                    }
                    data-tutor-board-id={kind === 'board' ? String(material.id) : undefined}
                    className={`hover:bg-background-page border-border-default flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 ${
                      selectedMaterialId === String(material.id)
                        ? 'border-border-focus bg-status-info-background'
                        : ''
                    }`}
                    onClick={() => setSelectedMaterialId(toMaterialId(material.id))}
                  >
                    {material.student_access_mode && (
                      <Badge
                        variant="default"
                        className={
                          material.student_access_mode === 'read_write'
                            ? 'text-s-base bg-background-subtle text-text-primary px-2 py-1 font-medium'
                            : material.student_access_mode === 'read_only'
                              ? 'text-s-base bg-tag-cyan-background text-tag-cyan-accent px-2 py-1 font-medium'
                              : 'text-s-base bg-tag-violet-background text-tag-violet-accent px-2 py-1 font-medium'
                        }
                      >
                        {accessLabel(material.student_access_mode)}
                      </Badge>
                    )}
                    <h3 className="text-m-base text-text-primary">{material.name}</h3>
                    <p className="text-xs-base text-text-secondary">
                      {t('whiteboards.updatedAt', {
                        date: new Date(material.updated_at).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                ))}
                <div
                  className="bg-status-info-background group flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-4"
                  onClick={handleCreate}
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
                t(isNote ? 'whiteboards.collaborativeLabelNote' : 'whiteboards.collaborativeLabel')
              ) : (
                <Trans
                  i18nKey={
                    isNote
                      ? 'whiteboards.collaborativeLabelNoteDesktop'
                      : 'whiteboards.collaborativeLabelDesktop'
                  }
                  ns="calls"
                  components={{ br: <br /> }}
                />
              )}
            </label>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
            <Button
              id="tutor-call-boards-confirm"
              size="m"
              onClick={handleConfirm}
              disabled={!selectedMaterialId}
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
